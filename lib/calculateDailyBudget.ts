/**
 * 計算「今天」距離下一次 specialDate(使用者設定的月結算日,1-31)還有幾天。
 * 規則:今天日期 ≤ specialDate → 目標日是本月的 specialDate 號;
 *      今天日期 > specialDate → 目標日是下個月的 specialDate 號。
 * 若目標月份沒有那一天(例如 31 號但該月只有 30 天),自動夾到當月最後一天。
 */
export function daysUntilSpecialDate(specialDate: number, today: Date = new Date()): number {
  const todayDay = today.getDate();
  let targetYear = today.getFullYear();
  let targetMonth = today.getMonth();
  if (todayDay > specialDate) {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(specialDate, daysInTargetMonth);

  const target = new Date(targetYear, targetMonth, targetDay).getTime();
  const start = new Date(today.getFullYear(), today.getMonth(), todayDay).getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;
  return Math.round((target - start) / DAY_MS);
}

/**
 * 平均每天還能花多少錢 = 結餘 / 剩餘天數。
 * 剩餘天數 ≤ 0,或結果為負數(代表已經透支)時回傳 null,畫面上顯示 NaN。
 */
export function calculateDailyBudget(balance: number, remainingDays: number): number | null {
  if (remainingDays <= 0) return null;
  const perDay = balance / remainingDays;
  if (!Number.isFinite(perDay) || perDay < 0) return null;
  return perDay;
}
