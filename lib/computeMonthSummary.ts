import Transaction from "@/lib/models/Transaction";
import Utility from "@/lib/models/Utility";
import CustomItem from "@/lib/models/CustomItem";
import PiggyBank from "@/lib/models/PiggyBank";
import { summarizeMonth, type MonthSummary } from "@/lib/summarizeMonth";
import { netAmount } from "@/lib/pointsDiscount";

/** 後端版本:查出某使用者某個月的原始資料,再用 summarizeMonth 算出彙總;寫入 OverviewSummary 快取由 recomputeOverviewSummary 負責。 */
export async function computeMonthSummary(userId: string, period: string): Promise<MonthSummary> {
  const [year, month] = period.split("-").map(Number);
  const [transactions, utility, customItems, piggyBank] = await Promise.all([
    Transaction.find({ user: userId, billingPeriod: period }).lean(),
    Utility.findOne({ user: userId, year, month }).lean(),
    CustomItem.find({ user: userId, year, month }).lean(),
    PiggyBank.findOne({ user: userId, period }).lean(),
  ]);

  return summarizeMonth({
    transactions: transactions.map((t) => ({
      type: t.type,
      category: t.category,
      amount: netAmount(t),
      subscription: t.subscription,
      cardId: t.card ? t.card.toString() : null,
    })),
    utility,
    customItems,
    piggyBankAmount: piggyBank?.amount ?? null,
  });
}
