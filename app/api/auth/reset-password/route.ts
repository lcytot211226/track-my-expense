import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { hashPassword, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const { email, code, newPassword } = await request.json();

  if (
    typeof email !== "string" ||
    !email ||
    typeof code !== "string" ||
    !code ||
    typeof newPassword !== "string" ||
    newPassword.length < 4
  ) {
    return NextResponse.json({ error: "請完整填寫 email、驗證碼與新密碼(至少 4 個字元)" }, { status: 400 });
  }

  await connectToDatabase();
  const user = await User.findOne({ email });
  if (
    !user ||
    !user.verificationCodeHash ||
    !user.verificationCodeExpires ||
    user.verificationCodeExpires < new Date()
  ) {
    return NextResponse.json({ error: "驗證碼錯誤或已過期" }, { status: 400 });
  }

  const isValid = await verifyPassword(code, user.verificationCodeHash);
  if (!isValid) {
    return NextResponse.json({ error: "驗證碼錯誤或已過期" }, { status: 400 });
  }

  user.password = await hashPassword(newPassword);
  // 能收到驗證碼代表確實擁有這個信箱,順便標記為已啟用。
  user.emailVerified = true;
  user.verificationCodeHash = null;
  user.verificationCodeExpires = null;
  await user.save();

  return NextResponse.json({ success: true });
}
