import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CardReconciliation, {
  CARD_RECONCILIATION_STATUSES,
  type CardReconciliationStatus,
} from "@/lib/models/CardReconciliation";
import { requireAuth } from "@/lib/auth";

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
  const records = await CardReconciliation.find({ user: auth.userId, period }).lean();
  // { [cardId]: "reconciled" | "paid" },沒出現在裡面的卡就是未對帳
  const statuses: Record<string, CardReconciliationStatus> = {};
  for (const r of records) {
    statuses[r.card.toString()] = r.status ?? "reconciled";
  }
  return NextResponse.json({ statuses });
}

/**
 * 設定某張卡在某個月的對帳進度:`status` 為 "reconciled" / "paid" 時建立或更新紀錄,
 * 為 null 時刪除紀錄(回到未對帳)。
 */
export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { card, period, status } = await request.json();
  if (!card || !period) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }
  if (status !== null && !CARD_RECONCILIATION_STATUSES.includes(status)) {
    return NextResponse.json({ error: "status 不合法" }, { status: 400 });
  }

  await connectToDatabase();

  if (status) {
    await CardReconciliation.findOneAndUpdate(
      { user: auth.userId, card, period },
      { user: auth.userId, card, period, status },
      { upsert: true }
    );
  } else {
    await CardReconciliation.deleteOne({ user: auth.userId, card, period });
  }

  return NextResponse.json({ status: status ?? null });
}
