import Share from "@/lib/models/Share";
import Card from "@/lib/models/Card";
// 只需要註冊 User model 讓 populate("owner") 能運作,不需要值本身,所以只做 side-effect import。
import "@/lib/models/User";
import type { User as UserDoc } from "@/lib/models/User";
import { getOverviewSummary } from "@/lib/getOverviewSummary";
import { cardIdFromItemKey, labelForItemKey } from "@/lib/overviewItems";

/** 別人分享給 email 的項目;金額即時從分享者當月的 OverviewSummary 讀出,收件人自己決定要不要 included。 */
export async function getIncomingShares(email: string, period: string) {
  const shares = await Share.find({ targetEmail: email.toLowerCase() })
    .populate<{ owner: UserDoc }>("owner")
    .sort({ createdAt: -1 });

  const ownerIds = Array.from(new Set(shares.map((s) => s.owner._id.toString())));

  // 各分享者的快取互不相依,同時讀;某個月還沒有快取的才現場算一次並補上。
  const summaries = await Promise.all(ownerIds.map((ownerId) => getOverviewSummary(ownerId, period)));
  const summaryByOwner = new Map(ownerIds.map((ownerId, i) => [ownerId, summaries[i]]));

  const ownerCards = ownerIds.length > 0 ? await Card.find({ user: { $in: ownerIds } }) : [];
  const cardNameById = new Map(ownerCards.map((c) => [c._id.toString(), c.name]));

  return shares.map((s) => {
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
}
