import nodemailer from "nodemailer";
import type { Config } from "@/config.js";

// メールを送る部品。serviceは buildDeps() から受け取る(テストでは送った物を覚える偽物を渡す)
export interface Mailer {
  // 宛先とコードはどちらも文字列なので、取り違えないように名前で渡す(0.7 T4)
  sendCode(mail: { to: string; code: string }): Promise<void>;
}

// SMTPで送る。手元では docker compose の mailpit が受け取る
export class SmtpMailer implements Mailer {
  private transporter;

  constructor(private readonly mail: Config["mail"]) {
    this.transporter = nodemailer.createTransport({
      host: mail.host,
      port: mail.port,
      // 手元のmailpitはログインが要らない。ユーザー名が無いときは、ログインを試さない
      ...(mail.user ? { auth: { user: mail.user, pass: mail.pass } } : {}),
    });
  }

  async sendCode({ to, code }: { to: string; code: string }): Promise<void> {
    const mailOptions = {
      from: this.mail.from,
      to,
      subject: "【重要】認証コードのお知らせ",
      text: `あなたの認証コードは ${code} です。15分以内に入力してください。`,
      html: `
        <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px;">
          <h3>認証コードのお知らせ</h3>
          <p>以下のコードを画面に入力してください。</p>
          <p style="font-size: 24px; font-weight: bold; color: #2d89ef;">${code}</p>
          <p>※有効期限は15分間です。</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
