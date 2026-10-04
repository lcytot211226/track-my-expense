import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { getIncomingShares } from "@/lib/getIncomingShares";

/**
 * 別人分享給我的項目;金額即時從分享者當月的 OverviewSummary 讀出,我這邊決定要不要 included。
 * /overview 改用 GET /api/overview 一次拿,這支保留給需要單獨讀取的情境。
 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period");
  if (!period) {
    return NextResponse.json({ error: "缺少 period" }, { status: 400 });
  }

  await connectToDatabase();
  const items = await getIncomingShares(auth.email, period);
  return NextResponse.json({ items });
}
