/**
 * 在 UTC 意義下,把日期往後加 n 個月,並保留「幾號」;若目標月份沒有那一天(例如 1/31 + 1 個月),
 * 自動夾到目標月份的最後一天(2/28 或 2/29)。所有運算都用 UTC,避免時區造成日期偏移一天。
 */
export function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getUTCDate();
  const totalMonths = date.getUTCFullYear() * 12 + date.getUTCMonth() + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, daysInTargetMonth);
  return new Date(Date.UTC(targetYear, targetMonth, clampedDay));
}
