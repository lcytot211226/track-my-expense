import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { hashPassword } from "@/lib/auth";
import { generateOtp, OTP_TTL_MS } from "@/lib/otp";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const { email } = await request.json();

  if (typeof email !== "string" || !email) {
    return NextResponse.json({ error: "請輸入 email" }, { status: 400 });
  }

  await connectToDatabase();
  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json({ error: "找不到帳號" }, { status: 404 });
  }
  if (user.emailVerified) {
    return NextResponse.json({ error: "帳號已啟用,請直接登入" }, { status: 400 });
  }

  const code = generateOtp();
  user.verificationCodeHash = await hashPassword(code);
  user.verificationCodeExpires = new Date(Date.now() + OTP_TTL_MS);
  await user.save();

  try {
    await sendVerificationEmail(email, code);
  } catch (err) {
    console.error("Failed to resend verification email", err);
    return NextResponse.json({ error: "驗證信寄送失敗,請稍後再試" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
