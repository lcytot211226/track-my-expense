export type TransactionCategory = "installment" | "cash" | "credit_card";

export type CardBillingInfo = {
  closingDate: number;
  paymentDate: number;
};

function formatYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function shiftMonth(year: number, month: number, delta: number) {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/**
 * 計算交易的歸屬月份 (billingPeriod)。
 * 現金交易直接以交易日期所在月份為準；信用卡/分期交易則依卡片的
 * closingDate/paymentDate 推算結帳週期與繳款月份，並在 posted = false 時再遞延一個月。
 */
export function calculateBillingPeriod(
  date: Date,
  category: TransactionCategory,
  posted: boolean,
  card?: CardBillingInfo | null
): string {
  const day = date.getDate();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  if (category === "cash") {
    return formatYearMonth(year, month);
  }

  if (!card) {
    throw new Error("card is required to calculate billingPeriod for credit_card/installment transactions");
  }

  const { closingDate, paymentDate } = card;

  // Step 1: 找出這筆交易歸屬的結帳週期
  const closingCycle =
    day <= closingDate ? { year, month } : shiftMonth(year, month, 1);

  // Step 2: 根據結帳週期,計算實際繳款月份
  const paymentCycle =
    paymentDate <= closingDate
      ? shiftMonth(closingCycle.year, closingCycle.month, 1)
      : closingCycle;

  // Step 3: 若 posted = false,再往後遞延一個月
  const finalCycle = posted ? paymentCycle : shiftMonth(paymentCycle.year, paymentCycle.month, 1);

  return formatYearMonth(finalCycle.year, finalCycle.month);
}
