import OverviewSummary from "@/lib/models/OverviewSummary";
import { recomputeOverviewSummary } from "@/lib/recomputeOverviewSummary";

/**
 * 讀某使用者某個月的 OverviewSummary 快取;還沒有快取、或是加入存錢罐欄位之前寫入的舊快取
 * (沒有 piggyBank 欄位,expense/balance 還沒扣掉存錢罐),就現場重算一次並補上。
 */
export async function getOverviewSummary(userId: string, period: string) {
  const summary = await OverviewSummary.findOne({ user: userId, period });
  if (summary && summary.piggyBank != null) return summary;
  return recomputeOverviewSummary(userId, period);
}
