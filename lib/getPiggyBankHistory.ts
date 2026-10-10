import PiggyBank from "@/lib/models/PiggyBank";
import { getOverviewSummary } from "@/lib/getOverviewSummary";

export type PiggyBankMonth = { period: string; amount: number; balance: number; saved: number };

/**
 * 每個有設定存錢罐的月份(由舊到新),連同「存錢前」的當月結餘與實際存下的金額。
 * 存錢罐只看自己的結餘(不含分享項目),實際存下的金額已經由 OverviewSummary 快取算好(piggyBank 欄位),
 * 快取裡的 balance 是扣掉存錢罐之後的,加回去就是存錢前的結餘。
 */
export async function getPiggyBankHistory(userId: string): Promise<PiggyBankMonth[]> {
  const goals = await PiggyBank.find({ user: userId }).sort({ period: 1 });

  return Promise.all(
    goals.map(async (goal) => {
      const summary = await getOverviewSummary(userId, goal.period);
      const saved = summary?.piggyBank ?? 0;
      return { period: goal.period, amount: goal.amount, balance: (summary?.balance ?? 0) + saved, saved };
    })
  );
}
