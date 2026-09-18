import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/auth";

/** 使用者點開通知鈴鐺查看後呼叫,把自己的已讀狀態設為已讀。 */
export async function POST() {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  await connectToDatabase();
  await User.findByIdAndUpdate(auth.userId, { notificationRead: true });
  return NextResponse.json({ success: true });
}
