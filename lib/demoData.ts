/** 首頁展示用的假資料,純粹用來介紹功能,不接資料庫、不會被任何 API 用到。 */

import { calculateDailyBudget, daysUntilSpecialDate } from "./calculateDailyBudget";

export const DEMO_DAILY_EXPENSE = [
  { label: "09/01", amount: 0, items: [] },
  { label: "09/02", amount: 320, items: [{ item: "手搖飲", amount: 320 }] },
  { label: "09/03", amount: 650, items: [{ item: "聚餐", amount: 650 }] },
  { label: "09/04", amount: 0, items: [] },
  { label: "09/05", amount: 0, items: [] },
  { label: "09/06", amount: 1280, items: [{ item: "家樂福採買", amount: 1280 }] },
  { label: "09/07", amount: 0, items: [] },
  { label: "09/08", amount: 450, items: [{ item: "Netflix + Spotify", amount: 450 }] },
  { label: "09/09", amount: 0, items: [] },
  { label: "09/10", amount: 390, items: [{ item: "早餐", amount: 390 }] },
  { label: "09/11", amount: 0, items: [] },
  { label: "09/12", amount: 3000, items: [{ item: "筆電分期(第2/12期)", amount: 3000 }] },
  { label: "09/13", amount: 0, items: [] },
  { label: "09/14", amount: 780, items: [{ item: "聚餐", amount: 780 }] },
];

/** 每一筆交易同時標記付款方式(payment,顯示用)與 kind(現金/單筆刷卡/分期/訂閱),用來拆算下方各分類小計,單一資料來源避免重複維護總額。 */
export const DEMO_EXPENSE_ITEMS = [
  { date: "09/02", item: "手搖飲", amount: 320, payment: "現金", kind: "cash" as const },
  { date: "09/03", item: "聚餐", amount: 650, payment: "現金", kind: "cash" as const },
  { date: "09/06", item: "家樂福採買", amount: 1280, payment: "國泰CUBE卡", kind: "credit_card" as const },
  { date: "09/08", item: "Netflix + Spotify", amount: 450, payment: "國泰CUBE卡", kind: "subscription" as const },
  { date: "09/10", item: "早餐", amount: 390, payment: "現金", kind: "cash" as const },
  { date: "09/12", item: "筆電分期(第2/12期)", amount: 3000, payment: "台新@GoGo卡", kind: "installment" as const },
  { date: "09/14", item: "聚餐", amount: 780, payment: "現金", kind: "cash" as const },
];

export const DEMO_INCOME_TOTAL = 45000;
export const DEMO_EXPENSE_TOTAL = DEMO_EXPENSE_ITEMS.reduce((sum, t) => sum + t.amount, 0);
export const DEMO_CASH_TOTAL = DEMO_EXPENSE_ITEMS.filter((t) => t.kind === "cash").reduce(
  (sum, t) => sum + t.amount,
  0
);
export const DEMO_INSTALLMENT_TOTAL = DEMO_EXPENSE_ITEMS.filter((t) => t.kind === "installment").reduce(
  (sum, t) => sum + t.amount,
  0
);
export const DEMO_SUBSCRIPTION_TOTAL = DEMO_EXPENSE_ITEMS.filter((t) => t.kind === "subscription").reduce(
  (sum, t) => sum + t.amount,
  0
);

export const DEMO_RENT = 15000;
export const DEMO_ELEC_COST = 1760;
export const DEMO_WATER_COST = 180;
export const DEMO_UTILITY_COST = DEMO_RENT + DEMO_ELEC_COST + DEMO_WATER_COST;
export const DEMO_CUSTOM_ITEMS = [{ name: "孝親費", amount: 3000 }];
export const DEMO_CUSTOM_ITEMS_TOTAL = DEMO_CUSTOM_ITEMS.reduce((sum, i) => sum + i.amount, 0);

export const DEMO_TOTAL_EXPENSE = DEMO_EXPENSE_TOTAL + DEMO_UTILITY_COST + DEMO_CUSTOM_ITEMS_TOTAL;

export const DEMO_INCOME_PREVIEW = [{ date: "09/05", payment: "現金", item: "薪水", amount: 45000 }];

export const DEMO_EXPENSE_PREVIEW = [...DEMO_EXPENSE_ITEMS]
  .sort((a, b) => (a.date < b.date ? 1 : -1))
  .map(({ date, payment, item, amount }) => ({ date, payment, item, amount }));

/** 每張卡的當月刷卡總額,把單筆刷卡/訂閱/分期不管哪種類別,依 payment 對應到卡片名稱加總,對帳狀態則是示範用的固定假資料。 */
export const DEMO_CARDS = [
  {
    name: "國泰CUBE卡",
    closingDate: 15,
    paymentDate: 3,
    total: DEMO_EXPENSE_ITEMS.filter((t) => t.payment === "國泰CUBE卡").reduce((sum, t) => sum + t.amount, 0),
    reconciled: true,
  },
  {
    name: "台新@GoGo卡",
    closingDate: 20,
    paymentDate: 8,
    total: DEMO_EXPENSE_ITEMS.filter((t) => t.payment === "台新@GoGo卡").reduce((sum, t) => sum + t.amount, 0),
    reconciled: false,
  },
];

/** 示範「別人分享給我」的項目:室友把當月房租水電分一半給我,我可以選擇要不要納入自己的支出統計。 */
export const DEMO_SHARED_ITEM = {
  ownerEmail: "roommate@example.com",
  label: "房租水電總開銷",
  amount: Math.round(DEMO_UTILITY_COST / 2),
  included: true,
};

// 假設「今天」是示範資料裡最後一天的隔天(9/15),月結算日設在 20 號。
const DEMO_TODAY = new Date(2026, 8, 15);
export const DEMO_SPECIAL_DATE = 20;
export const DEMO_REMAINING_DAYS = daysUntilSpecialDate(DEMO_SPECIAL_DATE, DEMO_TODAY);
export const DEMO_DAILY_BUDGET = calculateDailyBudget(
  DEMO_INCOME_TOTAL - DEMO_TOTAL_EXPENSE,
  DEMO_REMAINING_DAYS
);
