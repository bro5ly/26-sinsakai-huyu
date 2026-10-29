// src/lib/mail.ts
import nodemailer from "nodemailer";
import type { Config } from "@/config.js";

export class MailService {
  private transporter;

  constructor(private readonly mail: Config["mail"]) {
    this.transporter = nodemailer.createTransport({
      host: mail.host,
      port: mail.port,
      // 手元のmailpitはログインが要らない。ユーザー名が無いときは、ログインを試さない
      ...(mail.user ? { auth: { user: mail.user, pass: mail.pass } } : {}),
    });
  }

  async sendCode(email: string, code: string): Promise<void> {
    const mailOptions = {
      from: this.mail.from,
      to: email,
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
