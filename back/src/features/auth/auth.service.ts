import * as jwtLib from "@/lib/jwt.js"
import bcrypt from "bcrypt"
import { UserService } from "../user/UserService.js"
import type { UserWithProfile } from "../user/UserRepository.js"
import type { AuthRepository } from "./auth.repository.js"
import type { MailService } from "@/lib/mail.js"
import { AppError } from "@/lib/error.js"
import type { AuthResponse, VerificationResponse, VerifyCodeResponse } from "./auth.types.js"


export class AuthService {
    constructor(private userService: UserService, private authRepository: AuthRepository, private mailService: MailService){}

    requestVerification = async (studentId: string): Promise<VerificationResponse> => {
        //1. 受け取った学籍番号が別dbにあるか確認
        const student = await this.userService.findByExternalStudentId(studentId);
        if(!student) throw new AppError('ユーザーが見つかりません',404,'SUTUDENT_ID_NOT_FOUND')

        
        const existsUser = await this.userService.findByStudentId(studentId)
        if(existsUser) throw new AppError('すでに登録されています',409,'ALREADY_EXISTS_USER')
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
        if(!record) throw new AppError('コードを再送してください',400,'TMPCODE_NOT_FOUND')

        //コードの存在を確認
        if(!record.code) throw new AppError('コードがありません',404,'TMP_CODE_NOT_FOUND')
        
        //有効期限の確認
        if(new Date() > record.expiresAt){
            throw new AppError('期限切れのコードです',410,'VERIFICATION_NOT_STARTED')
        }

        if(record.code !== code){
            throw new AppError('不正なコードです',400,'INVALID_CODE')
        }
        
        await this.authRepository.deleteTmpCode(studentId)

        const registrationToken = jwtLib.signRegistrationToken({studentId})
        return {message: 'VerificationSuccess',registrationToken}
        //5. トークンとこのアプリの登録情報（nameとpassword）を受け取り、ユーザーの作成
        
    }

    signUp = async (plainPassword: string, registerToken: string): Promise<AuthResponse> => {

        const {studentId} = jwtLib.verifyRegistrationToken(registerToken) as {studentId: string}

        const existsUser = await this.userService.findByStudentId(studentId)
        if(existsUser) throw new AppError('すでに登録されています',409,'ALREADY_EXISTS_USER')

        const passwordHash = await bcrypt.hash(plainPassword,10)

        const user = await this.userService.create(studentId, passwordHash)
        if(!user) throw new AppError('ユーザーの作成に失敗しました',400,'CREATE_USER_FAILED')
         
        return this.generateSession(user)
    }

    login = async (studentId: string, plainPassword: string) => {
        const existsUser = await this.userService.findByStudentId(studentId)
        if(!existsUser) throw new AppError('ユーザーが見つかりません。',404,'USER_NOT_FOUND')
        const isMatch = await bcrypt.compare(plainPassword,existsUser.passwordHash)
        if(!isMatch) throw new AppError('パスワードが間違っています',400,'INVALID_PASSWORD')

        return this.generateSession(existsUser)
    }


    // auth.service.ts

    refreshSession = async (refreshToken: string): Promise<AuthResponse> => {
        // 1. まずは JWT として正しいか（改ざん・期限切れ）をチェック
        const payload = jwtLib.verifyRefreshToken(refreshToken) as { sub: string };

        // 2. 次に、DBにそのトークンが記録されているかチェック（★ここで作成したメソッドを使う）
        const savedToken = await this.authRepository.findRefreshToken(refreshToken);

        // DBにない ＝ すでにログアウト済み、あるいは不正なトークン
        if (!savedToken) {
            throw new AppError('セッションが無効です', 401, 'INVALID_SESSION');
        }

        // DB側の期限も一応チェック
        if (new Date() > savedToken.expiresAt) {
            throw new AppError('セッションの期限が切れました', 401, 'SESSION_EXPIRED');
        }

        // 3. 全てOKなら新しいセッションを発行
        const user = await this.userService.findById(payload.sub);
        if (!user) throw new AppError('ユーザーが見つかりません', 404, 'USER_NOT_FOUND');

        return this.generateSession(user);
    }

    private async generateSession(user: UserWithProfile): Promise<AuthResponse> {
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

        const profile = user.externalUser
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