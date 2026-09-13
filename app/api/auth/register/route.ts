import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return NextResponse.json({ error: "請輸入 email 與密碼" }, { status: 400 });
  }

  await connectToDatabase();

  const existingCount = await User.countDocuments();
  if (existingCount >= 2) {
    return NextResponse.json({ error: "已達註冊上限" }, { status: 403 });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return NextResponse.json({ error: "此 email 已被註冊" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  await User.create({ email, password: passwordHash, createDate: new Date() });

  return NextResponse.json({ success: true }, { status: 201 });
}
