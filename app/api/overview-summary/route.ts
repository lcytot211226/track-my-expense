import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import OverviewSummary from "@/lib/models/OverviewSummary";
import Card from "@/lib/models/Card";
import { requireAuth } from "@/lib/auth";
import { recomputeOverviewSummary } from "@/lib/recomputeOverviewSummary";
import { labelForItemKey } from "@/lib/overviewItems";

/** /overview 讀取彙總快取用;沒有快取(例如這個月從沒異動過)就即時計算一次並補上。 */
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
  let summary = await OverviewSummary.findOne({ user: auth.userId, period });
  if (!summary) {
    summary = await recomputeOverviewSummary(auth.userId, period);
  }

  const cards = await Card.find({ user: auth.userId });
  const cardNameById = new Map(cards.map((c) => [c._id.toString(), c.name]));

  // 每張卡都先放一格(預設 $0),這個月完全沒有刷卡紀錄的卡片也不會從畫面上消失。
  const cardBreakdown = new Map<string, { card: string; name: string; total: number }>();
  for (const c of cards) {
    cardBreakdown.set(c._id.toString(), { card: c._id.toString(), name: c.name, total: 0 });
  }
  for (const entry of summary.cards) {
    const id = entry.card.toString();
    const existing = cardBreakdown.get(id);
    cardBreakdown.set(id, { card: id, name: existing?.name ?? "已刪除的信用卡", total: entry.total });
  }

  const items = summary.items.map((i) => ({
    key: i.key,
    label: labelForItemKey(i.key, cardNameById),
    amount: i.amount,
  }));

  return NextResponse.json({
    summary: {
      period: summary.period,
      income: summary.income,
      expense: summary.expense,
      cash: summary.cash,
      installment: summary.installment,
      subscription: summary.subscription,
      utility: summary.utility,
      customItems: summary.customItems,
      balance: summary.balance,
    },
    cards: Array.from(cardBreakdown.values()),
    items,
  });
}
