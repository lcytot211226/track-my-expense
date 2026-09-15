import { Resend } from "resend";

const EMAIL_KEY = process.env.EMAIL_KEY;

if (!EMAIL_KEY) {
  throw new Error("Missing EMAIL_KEY environment variable in .env.local");
}

const resend = new Resend(EMAIL_KEY);

const FROM_ADDRESS = "noreply@mail.subani.cc";

function codeEmailHtml(title: string, code: string) {
  return `
    <div style="font-family: sans-serif; max-width: 420px; margin: 0 auto;">
      <h2 style="color: #171717;">${title}</h2>
      <p style="color: #52525b;">請在 10 分鐘內於網站上輸入以下驗證碼:</p>
      <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2a78d6;">${code}</p>
      <p style="color: #a1a1aa; font-size: 12px;">若不是你本人操作,請忽略此信件。</p>
    </div>
  `;
}

export async function sendVerificationEmail(to: string, code: string) {
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "記帳本 - 註冊驗證碼",
    html: codeEmailHtml("啟用你的記帳本帳號", code),
  });
}

export async function sendPasswordResetEmail(to: string, code: string) {
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "記帳本 - 重設密碼驗證碼",
    html: codeEmailHtml("重設記帳本密碼", code),
  });
}
