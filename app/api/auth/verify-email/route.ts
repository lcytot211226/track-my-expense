import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const { email, code } = await request.json();

  if (typeof email !== "string" || typeof code !== "string" || !email || !code) {
    return NextResponse.json({ error: "請輸入 email 與驗證碼" }, { status: 400 });
  }

  await connectToDatabase();
  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json({ error: "找不到帳號" }, { status: 404 });
  }

  if (user.emailVerified) {
    return NextResponse.json({ success: true });
  }

  if (!user.verificationCodeHash || !user.verificationCodeExpires || user.verificationCodeExpires < new Date()) {
    return NextResponse.json({ error: "驗證碼已過期,請重新寄送" }, { status: 400 });
  }

  const isValid = await verifyPassword(code, user.verificationCodeHash);
  if (!isValid) {
    return NextResponse.json({ error: "驗證碼錯誤" }, { status: 400 });
  }

  user.emailVerified = true;
  user.verificationCodeHash = null;
  user.verificationCodeExpires = null;
  await user.save();

  return NextResponse.json({ success: true });
}
