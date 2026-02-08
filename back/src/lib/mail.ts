// src/lib/mail.ts
import nodemailer from "nodemailer";
import 'dotenv/config'; // これを一番上に書く

export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT) || 2525, // Portは数値型にする必要があります
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  async sendCode(email: string, code: string) {
    const mailOptions = {
      from: process.env.MAIL_FROM || '"図書管理システム" <noreply@example.com>',
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

    return await this.transporter.sendMail(mailOptions);
  }
}