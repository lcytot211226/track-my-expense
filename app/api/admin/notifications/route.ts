import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Notification from "@/lib/models/Notification";
import User from "@/lib/models/User";
import { ADMIN_EMAIL, requireAuth } from "@/lib/auth";

/** 後台用:列出最新的系統公告,預設 10 筆,只有 ADMIN_EMAIL 這個帳號能用。 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth || auth.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 10;

  await connectToDatabase();
  const notifications = await Notification.find().sort({ createdAt: -1 }).limit(limit);
  return NextResponse.json({ notifications });
}

/** 後台用:發布一則新公告,只有 ADMIN_EMAIL 這個帳號能用。發布後所有使用者的已讀狀態重置為未讀。 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth || auth.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  const { title, content } = await request.json();
  if (typeof title !== "string" || typeof content !== "string" || !title.trim() || !content.trim()) {
    return NextResponse.json({ error: "請輸入主題與內容" }, { status: 400 });
  }

  await connectToDatabase();
  const notification = await Notification.create({ title: title.trim(), content: content.trim() });
  await User.updateMany({}, { notificationRead: false });

  return NextResponse.json({ notification }, { status: 201 });
}
