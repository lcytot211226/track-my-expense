export type TransactionCategory = "installment" | "cash" | "credit_card";

export type CardBillingInfo = {
  isDebit?: boolean | null;
  closingDate?: number | null;
  paymentDate?: number | null;
};

/** 從 Card document 取出計算歸屬月份需要的欄位 */
export function toCardBillingInfo(card: CardBillingInfo): CardBillingInfo {
  return { isDebit: !!card.isDebit, closingDate: card.closingDate, paymentDate: card.paymentDate };
}

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
 * closingDate/paymentDate 推算結帳週期與繳款月份(簽帳金融卡沒有結帳週期,同現金處理)，並在 posted = false 時再遞延一個月。
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

  // 簽帳金融卡當下就從帳戶扣款,不跑結帳邏輯,也不受 posted 影響
  if (card.isDebit) {
    return formatYearMonth(year, month);
  }

  const { closingDate, paymentDate } = card;
  if (closingDate == null || paymentDate == null) {
    throw new Error("credit card requires closingDate and paymentDate to calculate billingPeriod");
  }

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
