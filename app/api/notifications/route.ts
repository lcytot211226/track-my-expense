import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Notification from "@/lib/models/Notification";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/auth";

/** 給導覽列的通知鈴鐺用:固定回傳最新 3 筆系統公告,以及目前使用者是否已讀。 */
export async function GET() {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  await connectToDatabase();
  const [notifications, user] = await Promise.all([
    Notification.find().sort({ createdAt: -1 }).limit(3),
    User.findById(auth.userId),
  ]);

  return NextResponse.json({
    notifications,
    unread: !(user?.notificationRead ?? true),
  });
}
