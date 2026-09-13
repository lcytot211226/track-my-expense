import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { hashPassword, requireAuth, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "請輸入目前密碼與新密碼" }, { status: 400 });
  }
  if (typeof newPassword !== "string" || newPassword.length < 4) {
    return NextResponse.json({ error: "新密碼至少需要 4 個字元" }, { status: 400 });
  }

  await connectToDatabase();
  const user = await User.findById(auth.userId);
  if (!user) {
    return NextResponse.json({ error: "找不到帳號" }, { status: 404 });
  }

  if (!(await verifyPassword(currentPassword, user.password))) {
    return NextResponse.json({ error: "目前密碼不正確" }, { status: 401 });
  }

  user.password = await hashPassword(newPassword);
  await user.save();

  return NextResponse.json({ success: true });
}
