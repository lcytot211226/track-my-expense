import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Notification from "@/lib/models/Notification";
import { ADMIN_EMAIL, requireAuth } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };

/** 後台用:修改一則已發布的公告內容,只有 ADMIN_EMAIL 這個帳號能用。 */
export async function PUT(request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (!auth || auth.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  const { id } = await params;
  const { title, content } = await request.json();
  if (typeof title !== "string" || typeof content !== "string" || !title.trim() || !content.trim()) {
    return NextResponse.json({ error: "請輸入主題與內容" }, { status: 400 });
  }

  await connectToDatabase();
  const notification = await Notification.findByIdAndUpdate(
    id,
    { title: title.trim(), content: content.trim() },
    { new: true }
  );
  if (!notification) {
    return NextResponse.json({ error: "找不到這則通知" }, { status: 404 });
  }

  return NextResponse.json({ notification });
}

/** 後台用:刪除一則公告,只有 ADMIN_EMAIL 這個帳號能用。 */
export async function DELETE(_request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (!auth || auth.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  const { id } = await params;
  await connectToDatabase();
  const notification = await Notification.findByIdAndDelete(id);
  if (!notification) {
    return NextResponse.json({ error: "找不到這則通知" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
