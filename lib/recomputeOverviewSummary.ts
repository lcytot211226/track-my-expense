import Transaction from "@/lib/models/Transaction";
import Utility from "@/lib/models/Utility";
import CustomItem from "@/lib/models/CustomItem";
import OverviewSummary from "@/lib/models/OverviewSummary";
import { calculateMeterCost, type MeterInfo } from "@/lib/calculateMeterCost";

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

/**
 * 重新計算某使用者某個 billingPeriod 的 OverviewSummary 並覆寫快取。
 * 交易 / 水電 / 自訂項目任何一個異動之後都要呼叫這個函式,讓 /overview 可以直接讀快取,
 * 不用每次都重新拉整個月原始資料回來加總。
 */
export async function recomputeOverviewSummary(userId: string, period: string) {
  const [yearStr, monthStr] = period.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  const [transactions, utilityDoc, customItems] = await Promise.all([
    Transaction.find({ user: userId, billingPeriod: period }),
    Utility.findOne({ user: userId, year, month }),
    CustomItem.find({ user: userId, year, month }),
  ]);

  const incomeList = transactions.filter((t) => t.type === "income");
  const expenseList = transactions.filter((t) => t.type === "expense");

  const income = incomeList.reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = expenseList.reduce((sum, t) => sum + t.amount, 0);
  const cashTotal = expenseList.filter((t) => t.category === "cash").reduce((sum, t) => sum + t.amount, 0);
  const installmentTotal = expenseList
    .filter((t) => t.category === "installment")
    .reduce((sum, t) => sum + t.amount, 0);
  const subscriptionTotal = expenseList.filter((t) => t.subscription).reduce((sum, t) => sum + t.amount, 0);

  const cardTotals = new Map<string, number>();
  for (const t of expenseList) {
    if (!t.card) continue;
    const key = t.card.toString();
    cardTotals.set(key, (cardTotals.get(key) ?? 0) + t.amount);
  }

  const rentCost = utilityDoc?.rent ?? 0;
  const elecCost = utilityDoc ? calculateMeterCost(safeMeter(utilityDoc.elec)) : 0;
  const waterCost = utilityDoc ? calculateMeterCost(safeMeter(utilityDoc.water)) : 0;
  const utilityCost = rentCost + elecCost + waterCost;

  const customItemsTotal = customItems.reduce((sum, item) => sum + item.amount, 0);

  const expense = expenseTotal + utilityCost + customItemsTotal;
  const balance = income - expense;

  const cards = Array.from(cardTotals.entries()).map(([card, total]) => ({ card, total }));
  const items = [
    { key: "income", amount: income },
    { key: "expense", amount: expense },
    { key: "balance", amount: balance },
    { key: "cash", amount: cashTotal },
    { key: "installment", amount: installmentTotal },
    { key: "subscription", amount: subscriptionTotal },
    { key: "utility", amount: utilityCost },
    { key: "customItems", amount: customItemsTotal },
    ...cards.map(({ card, total }) => ({ key: `card:${card}`, amount: total })),
  ];

  const summary = await OverviewSummary.findOneAndUpdate(
    { user: userId, period },
    {
      user: userId,
      period,
      income: safeNumber(income),
      expense: safeNumber(expense),
      cash: safeNumber(cashTotal),
      installment: safeNumber(installmentTotal),
      subscription: safeNumber(subscriptionTotal),
      utility: safeNumber(utilityCost),
      customItems: safeNumber(customItemsTotal),
      balance: safeNumber(balance),
      cards: cards.map(({ card, total }) => ({ card, total: safeNumber(total) })),
      items: items.map(({ key, amount }) => ({ key, amount: safeNumber(amount) })),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return summary;
}
