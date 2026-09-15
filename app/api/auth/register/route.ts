import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { hashPassword } from "@/lib/auth";
import { generateOtp, OTP_TTL_MS } from "@/lib/otp";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return NextResponse.json({ error: "請輸入 email 與密碼" }, { status: 400 });
  }

  await connectToDatabase();

  const passwordHash = await hashPassword(password);
  const code = generateOtp();
  const verificationCodeHash = await hashPassword(code);
  const verificationCodeExpires = new Date(Date.now() + OTP_TTL_MS);

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    if (existingUser.emailVerified) {
      return NextResponse.json({ error: "此 email 已被註冊" }, { status: 409 });
    }
    // 尚未啟用過的帳號重新註冊:視為重新寄送驗證碼,並套用這次填的新密碼。
    existingUser.password = passwordHash;
    existingUser.verificationCodeHash = verificationCodeHash;
    existingUser.verificationCodeExpires = verificationCodeExpires;
    await existingUser.save();
  } else {
    await User.create({
      email,
      password: passwordHash,
      createDate: new Date(),
      emailVerified: false,
      verificationCodeHash,
      verificationCodeExpires,
    });
  }

  try {
    await sendVerificationEmail(email, code);
  } catch (err) {
    console.error("Failed to send verification email", err);
    return NextResponse.json(
      { success: true, email, error: "帳號已建立,但驗證信寄送失敗,請到下一步頁面重新寄送" },
      { status: 201 }
    );
  }

  return NextResponse.json({ success: true, email }, { status: 201 });
}
