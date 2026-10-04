import OverviewSummary from "@/lib/models/OverviewSummary";
import { computeMonthSummary } from "@/lib/computeMonthSummary";

/**
 * 重新計算某使用者某個 billingPeriod 的 OverviewSummary 並覆寫快取。
 * 交易 / 水電 / 自訂項目任何一個異動之後都要呼叫這個函式。這份快取只給「分享」用
 * (別人讀我的分享項目時只要查一筆,不用拉我整個月的原始資料);我自己的 /overview 不讀快取,
 * 直接用原始資料現場算。兩邊都走 lib/summarizeMonth,算出來的數字一定一致。
 */
export async function recomputeOverviewSummary(userId: string, period: string) {
  const summary = await computeMonthSummary(userId, period);

  const items = [
    { key: "income", amount: summary.income },
    { key: "expense", amount: summary.expense },
    { key: "balance", amount: summary.balance },
    { key: "cash", amount: summary.cash },
    { key: "installment", amount: summary.installment },
    { key: "subscription", amount: summary.subscription },
    { key: "utility", amount: summary.utility },
    { key: "customItems", amount: summary.customItems },
    ...summary.cards.map(({ card, total }) => ({ key: `card:${card}`, amount: total })),
  ];

  return OverviewSummary.findOneAndUpdate(
    { user: userId, period },
    { user: userId, period, ...summary, items },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}
