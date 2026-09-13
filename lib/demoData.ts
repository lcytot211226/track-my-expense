/** 首頁展示用的假資料,純粹用來介紹功能,不接資料庫、不會被任何 API 用到。 */

export const DEMO_DAILY_EXPENSE = [
  { label: "09/01", amount: 0 },
  { label: "09/02", amount: 320 },
  { label: "09/03", amount: 650 },
  { label: "09/04", amount: 0 },
  { label: "09/05", amount: 0 },
  { label: "09/06", amount: 1280 },
  { label: "09/07", amount: 0 },
  { label: "09/08", amount: 450 },
  { label: "09/09", amount: 0 },
  { label: "09/10", amount: 390 },
  { label: "09/11", amount: 0 },
  { label: "09/12", amount: 3000 },
  { label: "09/13", amount: 0 },
  { label: "09/14", amount: 780 },
];

export const DEMO_INCOME_TOTAL = 45000;
export const DEMO_EXPENSE_TOTAL = DEMO_DAILY_EXPENSE.reduce((sum, d) => sum + d.amount, 0);
export const DEMO_RENT = 15000;
export const DEMO_ELEC_COST = 1760;
export const DEMO_UTILITY_COST = DEMO_RENT + DEMO_ELEC_COST;
export const DEMO_TOTAL_EXPENSE = DEMO_EXPENSE_TOTAL + DEMO_UTILITY_COST;

export const DEMO_INCOME_PREVIEW = [{ date: "09/05", payment: "現金", item: "薪水", amount: 45000 }];

export const DEMO_EXPENSE_PREVIEW = [
  { date: "09/12", payment: "台新@GoGo卡", item: "筆電分期(第2/12期)", amount: 3000 },
  { date: "09/06", payment: "國泰CUBE卡", item: "家樂福採買", amount: 1280 },
  { date: "09/14", payment: "現金", item: "聚餐", amount: 780 },
  { date: "09/03", payment: "現金", item: "聚餐", amount: 650 },
  { date: "09/08", payment: "國泰CUBE卡", item: "Netflix + Spotify", amount: 450 },
];

export const DEMO_CARDS = [
  { name: "國泰CUBE卡", closingDate: 15, paymentDate: 3 },
  { name: "台新@GoGo卡", closingDate: 20, paymentDate: 8 },
];
