import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { hashPassword } from "@/lib/auth";
import { generateOtp, OTP_TTL_MS } from "@/lib/otp";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: Request) {
  const { email } = await request.json();

  if (typeof email !== "string" || !email) {
    return NextResponse.json({ error: "請輸入 email" }, { status: 400 });
  }

  await connectToDatabase();
  const user = await User.findOne({ email });

  // 不論帳號是否存在都回傳成功,避免洩漏 email 是否已註冊;只有帳號存在時才真的寄信。
  if (user) {
    const code = generateOtp();
    user.verificationCodeHash = await hashPassword(code);
    user.verificationCodeExpires = new Date(Date.now() + OTP_TTL_MS);
    await user.save();

    try {
      await sendPasswordResetEmail(email, code);
    } catch (err) {
      console.error("Failed to send password reset email", err);
      return NextResponse.json({ error: "驗證信寄送失敗,請稍後再試" }, { status: 502 });
    }
  }

  return NextResponse.json({ success: true });
}
