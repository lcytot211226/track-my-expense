import Subscription from "@/lib/models/Subscription";
import Transaction from "@/lib/models/Transaction";
import Card from "@/lib/models/Card";
import { calculateBillingPeriod } from "@/lib/calculateBillingPeriod";
import { addMonthsClamped } from "@/lib/addMonths";
import { recomputeOverviewSummary } from "@/lib/recomputeOverviewSummary";

// 訂閱的日期(startDate/occurrence)都是從 "YYYY-MM-DD" 字串或 addMonthsClamped 算出來的 UTC 午夜,
// 代表的其實是「當地行事曆上的哪一天」,所以這裡的「今天」也要用同樣方式表示,
// 否則在 UTC+8 這種正時區,今天到期的訂閱會因為時差誤判成「明天才到期」。
function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function monthsBetweenUTC(from: Date, to: Date): number {
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
}

/**
 * 惰性生成訂閱交易:每次呼叫時,把每個訂閱從「上次生成日期」之後、到今天為止已經到期的每個月扣款
 * 補生成成真正的 Transaction。之後就算訂閱被編輯或刪除,已生成的這些交易都是獨立紀錄,不會被回頭改動。
 *
 * 每次都用 addMonthsClamped(startDate, k) 從原始 startDate 重新算第 k 期,而不是拿上一期的日期繼續往後加,
 * 避免像 1/31 這種日期在 2 月被夾到 28 號後,後面每個月都卡在 28 號、回不去 31 號的「日期漂移」問題。
 */
export async function generateDueSubscriptionTransactions(userId: string) {
  const today = startOfToday();
  const subscriptions = await Subscription.find({ user: userId, startDate: { $lte: today } });
  const touchedPeriods = new Set<string>();

  for (const sub of subscriptions) {
    let occurrenceIndex = sub.lastGeneratedDate ? monthsBetweenUTC(sub.startDate, sub.lastGeneratedDate) + 1 : 0;
    let occurrence = addMonthsClamped(sub.startDate, occurrenceIndex);

    let cardBillingInfo: { closingDate: number; paymentDate: number } | null = null;
    if (sub.category === "credit_card" && sub.card) {
      const cardDoc = await Card.findOne({ _id: sub.card, user: userId });
      if (cardDoc) {
        cardBillingInfo = { closingDate: cardDoc.closingDate, paymentDate: cardDoc.paymentDate };
      }
    }

    let latestOccurrence: Date | null = null;
    while (occurrence <= today) {
      if (sub.category === "cash" || cardBillingInfo) {
        const billingPeriod = calculateBillingPeriod(occurrence, sub.category, true, cardBillingInfo);
        await Transaction.create({
          user: userId,
          type: "expense",
          date: occurrence,
          category: sub.category,
          item: sub.item,
          card: sub.category === "cash" ? null : sub.card,
          installmentInfo: null,
          amount: sub.amount,
          posted: true,
          billingPeriod,
          subscription: sub._id,
        });
        touchedPeriods.add(billingPeriod);
      }
      latestOccurrence = occurrence;
      occurrenceIndex += 1;
      occurrence = addMonthsClamped(sub.startDate, occurrenceIndex);
    }

    if (latestOccurrence) {
      sub.lastGeneratedDate = latestOccurrence;
      await sub.save();
    }
  }

  for (const period of touchedPeriods) {
    await recomputeOverviewSummary(userId, period);
  }
}
