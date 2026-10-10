/**
 * 信用卡單筆支出的「點數折抵」:只有 type = expense 且 category = credit_card 才能有,
 * 而且只在有折抵(> 0)時才寫進資料庫,其餘交易沒有這個欄位。
 * 實際計入統計的金額 = amount - pointsDiscount。
 */
export function netAmount(t: { amount: number; pointsDiscount?: number | null }): number {
  return t.amount - (t.pointsDiscount ?? 0);
}

/** 檢查並正規化點數折抵:不適用或 0/空值回傳 null(代表不存);不合法回傳錯誤訊息。 */
export function parsePointsDiscount(
  raw: unknown,
  { type, category, amount }: { type: string; category: string; amount: number }
): { value: number | null } | { error: string } {
  if (type !== "expense" || category !== "credit_card") return { value: null };
  if (raw === undefined || raw === null || raw === "") return { value: null };
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return { error: "點數折抵必須是 0 以上的數字" };
  if (value > amount) return { error: "點數折抵不能大於金額" };
  return { value: value > 0 ? value : null };
}
