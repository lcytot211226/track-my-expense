/** "YYYY-MM" 格式的月份字串往前/往後位移 delta 個月,一樣回傳 "YYYY-MM"。 */
export function shiftPeriod(period: string, delta: number): string {
  const [year, month] = period.split("-").map(Number);
  const total = year * 12 + (month - 1) + delta;
  const newYear = Math.floor(total / 12);
  const newMonth = (total % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

/** "YYYY-MM" 轉成畫面上顯示用的 "YY/MM"。 */
export function formatPeriodLabel(period: string): string {
  const [year, month] = period.split("-");
  return `${year.slice(2)}/${month}`;
}
