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
