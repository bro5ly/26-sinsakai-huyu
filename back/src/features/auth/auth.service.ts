import bcrypt from "bcrypt"
import type { Roster, RosterEntry } from "../roster/roster.js"
import { DomainError } from "@/lib/domain-error.js"
import { hashToken, newToken } from "@/lib/session-token.js"
import type { AuthResult, CodeStore, Mailer, SessionStore, UserRecord, UserStore, VerifyCodeResult } from "./auth.types.js"

// 登録用トークンの期限。応答の expiresAt もこれから作る
const REGISTRATION_TOKEN_MINUTES = 15
// Webのセッションは、作ってから7日で必ず切れる。使っても延ばさない(docs/backlog.md 0.8 A8-6)
export const WEB_SESSION_DAYS = 7

export class AuthService {
    constructor(private users: UserStore, private authRepository: CodeStore, private sessions: SessionStore, private mailService: Mailer, private roster: Roster){}

    requestVerification = async (studentId: string): Promise<void> => {
        //1. 受け取った学籍番号が別dbにあるか確認
        // 名簿にいない・登録済みでも、成功と同じ応答を返し、何も送らない(学籍番号があるか・登録済みかを知られないため。R-16・auth.md 4.6)
        const student = await this.roster.findByStudentId(studentId);
        if(!student) return

        const existsUser = await this.users.findByStudentId(studentId)
        if(existsUser) return
        //2. 存在する場合、dbからemailを取得
        //3. コードを作成してemailに送信
        // 6桁のランダムな数字を文字列として生成
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiredAt = new Date()
        expiredAt.setMinutes(expiredAt.getMinutes() + 15)
        await this.authRepository.saveTmpCode({code: verificationCode, studentId: student.studentId, expiresAt: expiredAt});
        await this.mailService.sendCode(student.email,verificationCode)
       
    }

    verifyCode = async (studentId: string, code: string): Promise<VerifyCodeResult> => {
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

        // コードは1回だけ使える。もうトークンを出したコードでは、もう1つ出さない(A8-8)
        if(record.tokenHash) throw new DomainError('INVALID_CODE')

        // 登録用トークンはDBにハッシュだけを置き、登録で1回使ったら行ごと消す(JWTと違い、1回だけにできる。A8-8)
        const token = newToken()
        // 画面が「あと何分で手続きが切れるか」を出せるように、期限も返す(docs/api.md 4.1)
        const expiresAt = new Date(Date.now() + REGISTRATION_TOKEN_MINUTES * 60 * 1000)
        await this.authRepository.saveRegistrationToken({studentId, tokenHash: hashToken(token), expiresAt})
        return {token, expiresAt}
    }

    signUp = async (plainPassword: string, registerToken: string): Promise<AuthResult> => {

        // でたらめ・使用済み(行ごと消してある)・期限切れは、どれも同じに断る
        const record = await this.authRepository.findByRegistrationTokenHash(hashToken(registerToken))
        if(!record || !record.tokenExpiresAt || new Date() >= record.tokenExpiresAt) throw new DomainError('INVALID_TOKEN')
        const {studentId} = record

        const existsUser = await this.users.findByStudentId(studentId)
        if(existsUser) throw new DomainError('ALREADY_REGISTERED')

        const entry = await this.roster.findByStudentId(studentId)
        if(!entry) throw new DomainError('INVALID_TOKEN')

        const passwordHash = await bcrypt.hash(plainPassword,10)
        const user = await this.users.create({studentId, passwordHash})
        await this.authRepository.deleteTmpCode(studentId)

        return this.createSession(user, entry)
    }

    login = async (studentId: string, plainPassword: string) => {
        const { user, entry } = await this.verifyCredentials(studentId, plainPassword)
        return this.createSession(user, entry)
    }

    // 学籍番号とパスワードで本人を確かめる。ログインと、タブレットの端末の登録(管理者がその場で確かめる。D2)が使う。
    // 学籍番号が無い・パスワード違い・無効な人・名簿から消えた、のどれかは言わない(R-16・R-A14)
    verifyCredentials = async (studentId: string, plainPassword: string): Promise<{ user: UserRecord; entry: RosterEntry }> => {
        const user = await this.users.findByStudentId(studentId)
        if(!user) throw new DomainError('INVALID_CREDENTIALS')
        const isMatch = await bcrypt.compare(plainPassword,user.passwordHash)
        if(!isMatch) throw new DomainError('INVALID_CREDENTIALS')
        if(!user.isActive) throw new DomainError('INVALID_CREDENTIALS')

        // 名簿から消えた人(卒業など)は、ここで止める。セッションの途中では名簿を見ない(A8-10)
        const entry = await this.roster.findByStudentId(user.studentId)
        if(!entry) throw new DomainError('INVALID_CREDENTIALS')

        return { user, entry }
    }


    // Cookieを消すだけでは、盗まれた番号が期限(7日)まで使えるので、DBからも消す(R-15)。無ければ何もしない
    logout = async (sessionToken: string | undefined): Promise<void> => {
        if (!sessionToken) return
        await this.sessions.deleteByTokenHash(hashToken(sessionToken))
    }

    // 番号そのものはCookieにだけ入れ、DBにはハッシュだけを置く。ログインのたびに別のセッションを作る(ほかの端末のログインは切らない。Q9)
    private async createSession(user: UserRecord, profile: RosterEntry): Promise<AuthResult> {
        const sessionToken = newToken()
        await this.sessions.create({
            tokenHash: hashToken(sessionToken),
            userId: user.id,
            kind: 'WEB',
            expiresAt: new Date(Date.now() + WEB_SESSION_DAYS * 24 * 60 * 60 * 1000),
        })

        return {
            sessionToken,
            // 学年・専攻・カードの番号は入れない(画面は /api/me で取る。docs/api.md 5章 SessionUser)
            user: {
                id: user.id,
                name: profile.name,
                studentId: user.studentId,
                userType: profile.userType,
                role: user.role,
            }
        };
    }
}
