import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Share from "@/lib/models/Share";
import { requireAuth } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };

/** 收件人(targetEmail 對得上自己的 email)決定要不要把這筆分享納入自己的支出計算。 */
export async function PUT(request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  const { included } = await request.json();

  await connectToDatabase();
  const share = await Share.findOneAndUpdate(
    { _id: id, targetEmail: auth.email.toLowerCase() },
    { included: !!included },
    { new: true }
  );
  if (!share) {
    return NextResponse.json({ error: "找不到分享紀錄" }, { status: 404 });
  }
  return NextResponse.json({ share });
}

/** 分享者刪除自己設定的分享。 */
export async function DELETE(_request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  const share = await Share.findOneAndDelete({ _id: id, owner: auth.userId });
  if (!share) {
    return NextResponse.json({ error: "找不到分享紀錄" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
