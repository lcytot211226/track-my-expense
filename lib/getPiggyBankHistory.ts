import PiggyBank from "@/lib/models/PiggyBank";
import OverviewSummary from "@/lib/models/OverviewSummary";
import { recomputeOverviewSummary } from "@/lib/recomputeOverviewSummary";
import { getIncomingShares } from "@/lib/getIncomingShares";
import { includedSharedNet } from "@/lib/overviewItems";
import { piggyBankSaved } from "@/lib/piggyBank";

export type PiggyBankMonth = { period: string; amount: number; balance: number; saved: number };

/**
 * 每個有設定存錢罐的月份(由舊到新),連同當月結餘與實際存下的金額。
 * 結餘跟 /overview 預設顯示的一致:自己的 OverviewSummary 結餘(沒有快取就現場算並補上)
 * 再加上收件人選擇納入的分享項目淨額。
 */
export async function getPiggyBankHistory(userId: string, email: string): Promise<PiggyBankMonth[]> {
  const goals = await PiggyBank.find({ user: userId }).sort({ period: 1 });

  return Promise.all(
    goals.map(async (goal) => {
      const [summary, shares] = await Promise.all([
        OverviewSummary.findOne({ user: userId, period: goal.period }).then(
          (found) => found ?? recomputeOverviewSummary(userId, goal.period)
        ),
        getIncomingShares(email, goal.period),
      ]);
      const balance = (summary?.balance ?? 0) + includedSharedNet(shares);
      return { period: goal.period, amount: goal.amount, balance, saved: piggyBankSaved(balance, goal.amount) };
    })
  );
}
