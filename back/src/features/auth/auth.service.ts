import * as jwtLib from "@/lib/jwt.js"
import bcrypt from "bcrypt"
import type { UserRepository } from "../user/UserRepository.js"
import type { Roster, RosterEntry } from "../roster/roster.js"
import type { AuthRepository } from "./auth.repository.js"
import type { MailService } from "@/lib/mail.js"
import { DomainError } from "@/lib/domain-error.js"
import type { AuthResponse, VerificationResponse, VerifyCodeResponse } from "./auth.types.js"

// テストで偽物を渡せるように、使うメソッドだけに絞った型で受け取る
export type UserStore = Pick<UserRepository, "create" | "findById" | "findByStudentId">
export type AuthStore = Pick<AuthRepository, "saveRefreshToken" | "findRefreshToken" | "saveTmpCode" | "checkTmpCode" | "deleteTmpCode">
export type Mailer = Pick<MailService, "sendCode">
type User = NonNullable<Awaited<ReturnType<UserStore["findById"]>>>

export class AuthService {
    constructor(private users: UserStore, private authRepository: AuthStore, private mailService: Mailer, private roster: Roster){}

    requestVerification = async (studentId: string): Promise<VerificationResponse> => {
        //1. 受け取った学籍番号が別dbにあるか確認
        // 名簿にいない・登録済みでも、成功と同じ応答を返し、何も送らない(学籍番号があるか・登録済みかを知られないため。R-16・auth.md 4.6)
        const student = await this.roster.findByStudentId(studentId);
        if(!student) return {message: 'CODE_SENT'}

        const existsUser = await this.users.findByStudentId(studentId)
        if(existsUser) return {message: 'CODE_SENT'}
        //2. 存在する場合、dbからemailを取得
        //3. コードを作成してemailに送信
        // 6桁のランダムな数字を文字列として生成
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiredAt = new Date()
        expiredAt.setMinutes(expiredAt.getMinutes() + 15)
        await this.authRepository.saveTmpCode({verificationCode,studentId: student.studentId,expiredAt});
        await this.mailService.sendCode(student.email,verificationCode)

        return {message: 'CODE_SENT'}
       
    }

    verifyCode = async (studentId: string, code: string): Promise<VerifyCodeResponse> => {
        //4. コードを検証し成功時にトークンを発行し返却
        const record = await this.authRepository.checkTmpCode(studentId)
        if(!record) throw new DomainError('INVALID_CODE')

        //コードの存在を確認
        if(!record.code) throw new DomainError('INVALID_CODE')
        
        //有効期限の確認
        if(new Date() > record.expiresAt){
            throw new DomainError('INVALID_CODE')
        }

        if(record.code !== code){
            throw new DomainError('INVALID_CODE')
        }
        
        await this.authRepository.deleteTmpCode(studentId)

        const registrationToken = jwtLib.signRegistrationToken({studentId})
        return {message: 'VerificationSuccess',registrationToken}
        //5. トークンとこのアプリの登録情報（nameとpassword）を受け取り、ユーザーの作成
        
    }

    signUp = async (plainPassword: string, registerToken: string): Promise<AuthResponse> => {

        // 壊れている・期限切れのトークンはJWTのライブラリの例外になるので、401に変える(500にしない。docs/api.md 3.2)
        let studentId: string
        try {
            ({studentId} = jwtLib.verifyRegistrationToken(registerToken) as {studentId: string})
        } catch {
            throw new DomainError('INVALID_TOKEN')
        }

        const existsUser = await this.users.findByStudentId(studentId)
        if(existsUser) throw new DomainError('ALREADY_REGISTERED')

        const entry = await this.roster.findByStudentId(studentId)
        if(!entry) throw new DomainError('INVALID_TOKEN')

        const passwordHash = await bcrypt.hash(plainPassword,10)
        const user = await this.users.create({studentId, passwordHash})

        return this.generateSession(user, entry)
    }

    login = async (studentId: string, plainPassword: string) => {
        const existsUser = await this.users.findByStudentId(studentId)
        // 学籍番号が無い・パスワード違い・名簿から消えた、のどれかは言わない(R-16・R-A14)
        if(!existsUser) throw new DomainError('INVALID_CREDENTIALS')
        const isMatch = await bcrypt.compare(plainPassword,existsUser.passwordHash)
        if(!isMatch) throw new DomainError('INVALID_CREDENTIALS')

        return this.generateSession(existsUser, await this.rosterEntryOf(existsUser, 'INVALID_CREDENTIALS'))
    }


    // auth.service.ts

    refreshSession = async (refreshToken: string): Promise<AuthResponse> => {
        // 1. まずは JWT として正しいか（改ざん・期限切れ）をチェック。Cookieが無い・壊れているときも401にする(500にしない)
        if (!refreshToken) throw new DomainError('INVALID_SESSION');
        let payload: { sub: string };
        try {
            payload = jwtLib.verifyRefreshToken(refreshToken) as { sub: string };
        } catch {
            throw new DomainError('INVALID_SESSION');
        }

        // 2. 次に、DBにそのトークンが記録されているかチェック（★ここで作成したメソッドを使う）
        const savedToken = await this.authRepository.findRefreshToken(refreshToken);

        // DBにない ＝ すでにログアウト済み、あるいは不正なトークン
        if (!savedToken) {
            throw new DomainError('INVALID_SESSION');
        }

        // DB側の期限も一応チェック
        if (new Date() > savedToken.expiresAt) {
            throw new DomainError('INVALID_SESSION');
        }

        // 3. 全てOKなら新しいセッションを発行
        const user = await this.users.findById(payload.sub);
        if (!user) throw new DomainError('INVALID_SESSION');

        return this.generateSession(user, await this.rosterEntryOf(user, 'INVALID_SESSION'));
    }

    // 名簿から消えた人(卒業など)は、登録が残っていても通さない(docs/spec.md Q13)
    private async rosterEntryOf(user: User, whenMissing: 'INVALID_CREDENTIALS' | 'INVALID_SESSION'): Promise<RosterEntry> {
        const entry = await this.roster.findByStudentId(user.studentId)
        if (!entry) throw new DomainError(whenMissing)
        return entry
    }

    private async generateSession(user: User, profile: RosterEntry): Promise<AuthResponse> {
        const accessToken = jwtLib.signAccessToken({
            sub: user.id,
            role: user.role
        })

        const refreshToken = jwtLib.signRefreshToken({
            sub: user.id
        })

        const days = 7
        const expiredAt = new Date()
        expiredAt.setDate(expiredAt.getDate() + days)

        await this.authRepository.saveRefreshToken({userId: user.id,refreshToken,expiredAt})

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: profile.name,
                userType: profile.userType,
                grade: profile.grade,
                major: profile.major,
                studentId: user.studentId,
                serialNumber: profile.serialNumber
            }
        };
    }
}