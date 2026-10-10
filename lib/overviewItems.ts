/** 可自由選取拿去分享的固定項目 key,對應 OverviewSummary 裡的固定欄位。信用卡是動態的 "card:<cardId>"。 */
export const FIXED_OVERVIEW_ITEM_KEYS = [
  "income",
  "expense",
  "balance",
  "cash",
  "installment",
  "subscription",
  "utility",
  "customItems",
] as const;

export type FixedOverviewItemKey = (typeof FIXED_OVERVIEW_ITEM_KEYS)[number];

export const FIXED_ITEM_LABELS: Record<FixedOverviewItemKey, string> = {
  income: "收入",
  expense: "支出",
  balance: "結餘",
  cash: "現金開銷",
  installment: "分期總開銷",
  subscription: "訂閱總開銷",
  utility: "房租水電總開銷",
  customItems: "自訂項目總開銷",
};

export function cardItemKey(cardId: string): string {
  return `card:${cardId}`;
}

export function cardIdFromItemKey(key: string): string | null {
  return key.startsWith("card:") ? key.slice("card:".length) : null;
}

/** 依 itemKey 解析顯示用的名稱,信用卡類需要外部傳入「卡片 id -> 名稱」對照表。 */
export function labelForItemKey(key: string, cardNameById: Map<string, string>): string {
  const cardId = cardIdFromItemKey(key);
  if (cardId) {
    return cardNameById.get(cardId) ?? "已刪除的信用卡";
  }
  return FIXED_ITEM_LABELS[key as FixedOverviewItemKey] ?? key;
}

export function formatPeriod(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * 別人分享給我的項目納入「我」的支出總額時的實際貢獻值:
 * - 收入(income)與結餘(balance)對「支出」而言是負向貢獻(等於抵銷支出),要反轉正負號。
 *   結餘可以放心計入:OverviewSummary 快取只由分享者自己的原始資料算出,不含任何分享項目,
 *   所以就算雙方互相分享結餘也不會遞迴或重複灌水。
 * - 其餘(現金/分期/信用卡等開銷類項目)維持原本金額。
 */
export function sharedItemContribution(itemKey: string, amount: number): number {
  if (itemKey === "income" || itemKey === "balance") return -amount;
  return amount;
}

/**
 * 收件人選擇納入(included)的分享項目,以「收入為正、支出為負」加總成一個淨額。
 * /overview 用它調整畫面上的收入/支出/結餘(純顯示,不影響存錢罐,也不寫進快取)。
 */
export function includedSharedNet(items: { itemKey: string; amount: number; included: boolean }[]): number {
  return items.filter((s) => s.included).reduce((sum, s) => sum - sharedItemContribution(s.itemKey, s.amount), 0);
}
