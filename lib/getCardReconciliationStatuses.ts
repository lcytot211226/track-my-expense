import CardReconciliation, { type CardReconciliationStatus } from "@/lib/models/CardReconciliation";

/** { [cardId]: "reconciled" | "paid" },沒出現在裡面的卡就是未對帳。 */
export async function getCardReconciliationStatuses(
  userId: string,
  period: string
): Promise<Record<string, CardReconciliationStatus>> {
  const records = await CardReconciliation.find({ user: userId, period }).lean();
  const statuses: Record<string, CardReconciliationStatus> = {};
  for (const r of records) {
    statuses[r.card.toString()] = r.status ?? "reconciled";
  }
  return statuses;
}
