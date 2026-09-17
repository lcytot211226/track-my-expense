import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Share from "@/lib/models/Share";
import Card from "@/lib/models/Card";
import OverviewSummary, { type OverviewSummary as OverviewSummaryDoc } from "@/lib/models/OverviewSummary";
// 只需要註冊 User model 讓 populate("owner") 能運作,不需要值本身,所以只做 side-effect import。
import "@/lib/models/User";
import type { User as UserDoc } from "@/lib/models/User";
import { requireAuth } from "@/lib/auth";
import { recomputeOverviewSummary } from "@/lib/recomputeOverviewSummary";
import { cardIdFromItemKey, labelForItemKey } from "@/lib/overviewItems";

/** 別人分享給我的項目;金額即時從分享者當月的 OverviewSummary 讀出,我這邊決定要不要 included。 */
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
  const shares = await Share.find({ targetEmail: auth.email.toLowerCase() })
    .populate<{ owner: UserDoc }>("owner")
    .sort({ createdAt: -1 });

  const ownerIds = Array.from(new Set(shares.map((s) => s.owner._id.toString())));

  const summaryByOwner = new Map<string, OverviewSummaryDoc>();
  for (const ownerId of ownerIds) {
    let summary = await OverviewSummary.findOne({ user: ownerId, period });
    if (!summary) {
      summary = await recomputeOverviewSummary(ownerId, period);
    }
    summaryByOwner.set(ownerId, summary);
  }

  const ownerCards = ownerIds.length > 0 ? await Card.find({ user: { $in: ownerIds } }) : [];
  const cardNameById = new Map(ownerCards.map((c) => [c._id.toString(), c.name]));

  const items = shares.map((s) => {
    const ownerId = s.owner._id.toString();
    const summary = summaryByOwner.get(ownerId);
    const cardId = cardIdFromItemKey(s.itemKey);
    let amount = 0;
    if (summary) {
      if (cardId) {
        amount = summary.cards.find((c) => c.card.toString() === cardId)?.total ?? 0;
      } else {
        amount = (summary as unknown as Record<string, number>)[s.itemKey] ?? 0;
      }
    }
    return {
      _id: s._id.toString(),
      ownerEmail: s.owner.email,
      itemKey: s.itemKey,
      label: labelForItemKey(s.itemKey, cardNameById),
      amount,
      included: s.included,
    };
  });

  return NextResponse.json({ items });
}
