import type { Model } from "mongoose";
import User from "@/lib/models/User";
import Transaction from "@/lib/models/Transaction";

/** 後台統計一律以台灣時間(UTC+8,無日光節約)切日。 */
const TZ = "+08:00";
const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

export type DailyCount = { date: string; label: string; count: number };

export type WindowStats = {
  /** 近 N 天(含今天)的總數 */
  total: number;
  /** 跟昨天的近 N 天比:今天的數量 − 昨天窗口第一天(已滑出窗口)的數量 */
  delta: number;
  /** 近 N 天每天的數量,沒有資料的日子補 0 */
  daily: DailyCount[];
};

/** UTC+8 下第 offset 天(0 = 今天、-1 = 昨天)的 "YYYY-MM-DD" 與該日 00:00 的實際時間。 */
function taipeiDay(offset: number) {
  const shifted = new Date(Date.now() + TZ_OFFSET_MS);
  const startUtc = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() + offset);
  const key = new Date(startUtc).toISOString().slice(0, 10);
  return { key, start: new Date(startUtc - TZ_OFFSET_MS) };
}

/**
 * 近 days 天(含今天)每天新增的筆數。多抓前一天,用來算窗口滑動時的升降:
 * 今天的窗口 [今天-(days-1), 今天] 跟昨天的窗口 [今天-days, 昨天] 只差頭尾兩天,
 * 所以 delta = 今天 − (今天-days 那天)。
 */
async function windowStats<T>(model: Model<T>, field: string, days: number): Promise<WindowStats> {
  const rows: { _id: string; count: number }[] = await model.aggregate([
    { $match: { [field]: { $gte: taipeiDay(-days).start } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: `$${field}`, timezone: TZ } }, count: { $sum: 1 } } },
  ]);
  const countByDay = new Map(rows.map((r) => [r._id, r.count]));
  const countOf = (offset: number) => countByDay.get(taipeiDay(offset).key) ?? 0;

  const daily: DailyCount[] = [];
  for (let offset = -(days - 1); offset <= 0; offset++) {
    const { key } = taipeiDay(offset);
    const [, month, day] = key.split("-").map(Number);
    daily.push({ date: key, label: `${month}/${day}`, count: countOf(offset) });
  }

  return {
    total: daily.reduce((sum, d) => sum + d.count, 0),
    delta: countOf(0) - countOf(-days),
    daily,
  };
}

/** 後台使用者頁上方的統計:近 30 天加入人數、近 7 天新增交易數(依建立時間,含訂閱自動生成與分期各期)。 */
export async function getAdminStats() {
  const [signups, transactions] = await Promise.all([
    windowStats(User, "createDate", 30),
    windowStats(Transaction, "createdAt", 7),
  ]);
  return { signups, transactions };
}
