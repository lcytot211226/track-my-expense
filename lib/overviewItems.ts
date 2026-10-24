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

export type SharedTotals = { income: number; expense: number };

export type SharedItemForTotals = {
  /** 分享者(同一個人分享的多個項目要一起判斷重疊) */
  owner: string;
  itemKey: string;
  amount: number;
  included: boolean;
  /** 只有 balance 項目會帶:分享者當月的收入與支出,結餘 = 兩者都抓 */
  income?: number;
  expense?: number;
};

/**
 * 收件人選擇納入(included)的分享項目,收入和支出分開加總,/overview 分別加進自己的收入與支出
 * (純顯示,不影響存錢罐,也不寫進快取):
 * - income:加進收入
 * - balance(結餘):代表分享者的收入和支出都抓,分別加進收入與支出
 * - expense 與其他開銷類(現金 / 分期 / 訂閱 / 房租水電 / 自訂項目 / 信用卡):加進支出
 *
 * 同一個分享者的項目會去掉明顯的重疊,避免重複計算:選了結餘就已經包含他的收入與全部支出,其他項目不再加;
 * 選了支出就已經包含所有開銷類分項,分項不再加。分項之間本身的重疊(例如分期也算在某張信用卡裡)不處理。
 *
 * 結餘可以放心計入:OverviewSummary 快取只由分享者自己的原始資料算出,不含任何分享項目,
 * 所以就算雙方互相分享結餘也不會遞迴或重複灌水。
 */
export function includedSharedTotals(items: SharedItemForTotals[]): SharedTotals {
  const byOwner = new Map<string, SharedItemForTotals[]>();
  for (const item of items) {
    if (!item.included) continue;
    const list = byOwner.get(item.owner) ?? [];
    list.push(item);
    byOwner.set(item.owner, list);
  }

  let income = 0;
  let expense = 0;
  for (const list of byOwner.values()) {
    const balance = list.find((i) => i.itemKey === "balance");
    if (balance) {
      income += balance.income ?? 0;
      expense += balance.expense ?? 0;
      continue;
    }
    income += list.filter((i) => i.itemKey === "income").reduce((sum, i) => sum + i.amount, 0);
    const totalExpense = list.find((i) => i.itemKey === "expense");
    expense += totalExpense
      ? totalExpense.amount
      : list.filter((i) => i.itemKey !== "income").reduce((sum, i) => sum + i.amount, 0);
  }
  return { income, expense };
}
