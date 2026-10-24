import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import OverviewSummary from "@/lib/models/OverviewSummary";
import Card from "@/lib/models/Card";
import Share from "@/lib/models/Share";
import { requireAuth } from "@/lib/auth";
import { generateDueSubscriptionTransactions } from "@/lib/generateSubscriptionTransactions";
import { getOverviewSummary } from "@/lib/getOverviewSummary";
import { summaryItemAmount } from "@/lib/getIncomingShares";
import { formatPeriod, includedSharedNet } from "@/lib/overviewItems";

/**
 * /overview 的年度檢視:一次回傳某年 12 個月的 OverviewSummary 快取。
 * 一次查出整年的快取;沒有快取或是缺 piggyBank 的舊快取,才逐月走 getOverviewSummary 現場算並補上,
 * 之後同一年再看就只剩一次查詢。快取只含自己的收支;另外附上每個月別人分享給我、且目前勾選納入
 * (included)的項目淨額 sharedNet,要不要計入由前端切換。
 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  if (!Number.isInteger(year) || year < 1970 || year > 9999) {
    return NextResponse.json({ error: "缺少或格式錯誤的 year" }, { status: 400 });
  }

  await connectToDatabase();
  // 跟交易列表一樣,先補生成到期的訂閱交易(會一併重算受影響月份的快取),年度數字才不會漏掉最新的扣款。
  await generateDueSubscriptionTransactions(auth.userId);

  const periods = Array.from({ length: 12 }, (_, i) => formatPeriod(year, i + 1));
  const [cached, cards, sharedNetByPeriod] = await Promise.all([
    OverviewSummary.find({ user: auth.userId, period: { $in: periods } }),
    Card.find({ user: auth.userId }).sort({ createdAt: 1 }),
    getYearSharedNet(auth.email, periods),
  ]);
  const byPeriod = new Map(cached.map((s) => [s.period, s]));

  const summaries = await Promise.all(
    periods.map((period) => {
      const summary = byPeriod.get(period);
      return summary && summary.piggyBank != null ? summary : getOverviewSummary(auth.userId, period);
    })
  );

  const months = summaries.map((s, i) => ({
    period: periods[i],
    income: s?.income ?? 0,
    expense: s?.expense ?? 0,
    balance: s?.balance ?? 0,
    cash: s?.cash ?? 0,
    installment: s?.installment ?? 0,
    subscription: s?.subscription ?? 0,
    utility: s?.utility ?? 0,
    customItems: s?.customItems ?? 0,
    piggyBank: s?.piggyBank ?? 0,
    cards: (s?.cards ?? []).map((c) => ({ card: String(c.card), total: c.total })),
    sharedNet: sharedNetByPeriod.get(periods[i]) ?? 0,
  }));

  return NextResponse.json({
    year,
    months,
    cards: cards.map((c) => ({ _id: String(c._id), name: c.name, isDebit: !!c.isDebit })),
  });
}

/**
 * 每個月別人分享給我、且目前勾選納入的項目淨額(收入為正、支出為負,同 /overview 月檢視的共享總額)。
 * 用的是「現在」的納入設定套到整年,跟月檢視一致。分享者的快取一次查出整年,缺的才逐月現場算。
 */
async function getYearSharedNet(email: string, periods: string[]) {
  const result = new Map<string, number>();
  const shares = await Share.find({ targetEmail: email.toLowerCase(), included: true });
  if (shares.length === 0) return result;

  const ownerIds = Array.from(new Set(shares.map((s) => s.owner.toString())));
  const cached = await OverviewSummary.find({ user: { $in: ownerIds }, period: { $in: periods } });
  const cacheKey = (ownerId: string, period: string) => `${ownerId}:${period}`;
  const byKey = new Map(cached.map((s) => [cacheKey(s.user.toString(), s.period), s]));

  await Promise.all(
    periods.flatMap((period) =>
      ownerIds.map(async (ownerId) => {
        const key = cacheKey(ownerId, period);
        const summary = byKey.get(key);
        if (!summary || summary.piggyBank == null) {
          const fresh = await getOverviewSummary(ownerId, period);
          if (fresh) byKey.set(key, fresh);
        }
      })
    )
  );

  for (const period of periods) {
    const items = shares.map((s) => ({
      itemKey: s.itemKey,
      included: true,
      amount: summaryItemAmount(byKey.get(cacheKey(s.owner.toString(), period)), s.itemKey),
    }));
    result.set(period, includedSharedNet(items));
  }
  return result;
}
