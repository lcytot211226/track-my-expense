import { calculateMeterCost, type MeterInfo } from "@/lib/calculateMeterCost";

/**
 * 某使用者某個 billingPeriod 的收支彙總計算。純函式、不碰資料庫,前後端共用同一份邏輯:
 * - 前端 /overview 用已經抓回來的當月原始資料直接算(不讀快取)
 * - 後端 recomputeOverviewSummary 查完原始資料後用它算,再寫進 OverviewSummary 快取給分享使用
 */

export type SummaryTransaction = {
  type: "income" | "expense";
  category: "installment" | "cash" | "credit_card";
  amount: number;
  /** 由訂閱生成的交易才有值,只用來判斷是不是訂閱 */
  subscription: unknown;
  /** 關聯信用卡的 id 字串,現金交易為 null */
  cardId: string | null;
};

export type SummaryUtility = {
  rent?: number | null;
  elec?: Partial<MeterInfo> | null;
  water?: Partial<MeterInfo> | null;
  rentEnabled?: boolean | null;
  elecEnabled?: boolean | null;
  waterEnabled?: boolean | null;
  enabled?: boolean | null;
};

export type MonthSummary = {
  income: number;
  expense: number; // 交易支出 + 房租水電 + 自訂項目
  cash: number;
  installment: number;
  subscription: number;
  utility: number;
  customItems: number;
  balance: number; // income - expense
  /** 每張有刷卡紀錄的卡當月總額(沒刷卡的卡不會出現,需要 $0 的話由呼叫端自己補) */
  cards: { card: string; total: number }[];
};

/** 舊資料可能是在新增水費/電費欄位前建立的,部分或整個欄位可能缺漏,逐欄補上預設值避免算出 NaN。 */
function safeMeter(meter?: Partial<MeterInfo> | null): MeterInfo {
  return {
    start: meter?.start ?? 0,
    end: meter?.end ?? 0,
    unitPrice: meter?.unitPrice ?? 0,
    manualAmount: meter?.manualAmount ?? null,
  };
}

function safeNumber(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

function sum(amounts: number[]): number {
  return amounts.reduce((total, n) => total + n, 0);
}

export function summarizeMonth({
  transactions,
  utility,
  customItems,
}: {
  transactions: SummaryTransaction[];
  utility: SummaryUtility | null;
  customItems: { amount: number }[];
}): MonthSummary {
  const incomeList = transactions.filter((t) => t.type === "income");
  const expenseList = transactions.filter((t) => t.type === "expense");

  const income = sum(incomeList.map((t) => t.amount));
  const expenseTotal = sum(expenseList.map((t) => t.amount));
  const cash = sum(expenseList.filter((t) => t.category === "cash").map((t) => t.amount));
  const installment = sum(expenseList.filter((t) => t.category === "installment").map((t) => t.amount));
  const subscription = sum(expenseList.filter((t) => t.subscription).map((t) => t.amount));

  const cardTotals = new Map<string, number>();
  for (const t of expenseList) {
    if (!t.cardId) continue;
    cardTotals.set(t.cardId, (cardTotals.get(t.cardId) ?? 0) + t.amount);
  }

  // 租金/電費/水費各自可以關閉,關閉的項目不計入「房租水電總開銷」,也就不會影響支出/結餘。
  const rentCost = utility && utility.rentEnabled !== false ? (utility.rent ?? 0) : 0;
  const elecCost = utility && utility.elecEnabled !== false ? calculateMeterCost(safeMeter(utility.elec)) : 0;
  const waterCost = utility && utility.waterEnabled !== false ? calculateMeterCost(safeMeter(utility.water)) : 0;
  // 總開關關閉時,不論租金/電費/水費各自的開關是什麼狀態,這個月的房租水電一律不計入統計,
  // 但不會改動也不會清空租金/電費/水費各自存的開關狀態,重新打開總開關後會照原樣恢復。
  const utilityCost = utility?.enabled !== false ? rentCost + elecCost + waterCost : 0;

  const customItemsTotal = sum(customItems.map((item) => item.amount));

  const expense = expenseTotal + utilityCost + customItemsTotal;

  return {
    income: safeNumber(income),
    expense: safeNumber(expense),
    cash: safeNumber(cash),
    installment: safeNumber(installment),
    subscription: safeNumber(subscription),
    utility: safeNumber(utilityCost),
    customItems: safeNumber(customItemsTotal),
    balance: safeNumber(income - expense),
    cards: Array.from(cardTotals, ([card, total]) => ({ card, total: safeNumber(total) })),
  };
}
