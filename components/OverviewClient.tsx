"use client";

import { useCallback, useEffect, useState } from "react";
import MonthPicker from "./MonthPicker";
import OverviewChart, { type DailyExpense } from "./OverviewChart";
import UtilityInlineEditor, { type UtilityDTO } from "./UtilityInlineEditor";
import CustomItemsEditor, { type CustomItemDTO } from "./CustomItemsEditor";
import SharedItemsSection, { type IncomingShareDTO } from "./SharedItemsSection";
import type { TransactionDTO } from "./TransactionsClient";
import { usePeriod } from "@/lib/usePeriod";
import { calculateDailyBudget, daysUntilSpecialDate } from "@/lib/calculateDailyBudget";
import { useToast } from "./ToastProvider";
import {
  ArrowDownCircleIcon,
  ArrowPathIcon,
  ArrowUpCircleIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  HomeIcon,
  QuestionMarkCircleIcon,
  ScaleIcon,
  TagIcon,
  UserGroupIcon,
} from "./icons";

const DAY_MS = 24 * 60 * 60 * 1000;

function parsePeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  return { year, month };
}

function isoDateKey(epochMs: number) {
  const d = new Date(epochMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function formatMMDD(epochMs: number) {
  const d = new Date(epochMs);
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${String(d.getUTCDate()).padStart(2, "0")}`;
}

function parseISODateToUTC(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** 若某個 API 回傳非 2xx 或空 body(例如伺服器端出錯),回傳空物件而不是讓 .json() 直接炸掉整頁。 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!res.ok || !text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export default function OverviewClient() {
  const { period, setPeriod, ready } = usePeriod();
  const { showLoading, dismiss } = useToast();
  const [utility, setUtility] = useState<UtilityDTO | null>(null);
  const [customItems, setCustomItems] = useState<CustomItemDTO[]>([]);
  const [transactions, setTransactions] = useState<TransactionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialDate, setSpecialDate] = useState<number | null>(null);
  const [showInstallmentInChart, setShowInstallmentInChart] = useState(false);
  const [reconciledCardIds, setReconciledCardIds] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<{
    income: number;
    expense: number;
    cash: number;
    installment: number;
    subscription: number;
    utility: number;
    customItems: number;
    balance: number;
  } | null>(null);
  const [cardBreakdown, setCardBreakdown] = useState<{ id: string; name: string; total: number }[]>([]);
  const [incomingShares, setIncomingShares] = useState<IncomingShareDTO[]>([]);

  const { year, month } = parsePeriod(period);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setSpecialDate(typeof data.specialDate === "number" ? data.specialDate : null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const toastId = showLoading("資料載入中…");
    try {
      const [utilityRes, customItemsRes, transactionsRes, reconciliationRes, summaryRes, incomingRes] =
        await Promise.all([
          fetch(`/api/utilities?year=${year}&month=${month}`),
          fetch(`/api/custom-items?year=${year}&month=${month}`),
          fetch(`/api/transactions?billingPeriod=${period}`),
          fetch(`/api/card-reconciliations?period=${period}`),
          // OverviewSummary 是後端維護的彙總快取,總覽的加總數字直接讀這裡,不用每次都把整月原始資料抓回來重算。
          fetch(`/api/overview-summary?period=${period}`),
          fetch(`/api/shares/incoming?period=${period}`),
        ]);
      const utilityData = await readJson(utilityRes);
      const customItemsData = await readJson(customItemsRes);
      const transactionsData = await readJson(transactionsRes);
      const reconciliationData = await readJson(reconciliationRes);
      const summaryData = await readJson(summaryRes);
      const incomingData = await readJson(incomingRes);

      const found = utilityData.utilities?.[0];
      // 舊資料可能是在新增水費欄位前建立的,保底補上預設值避免畫面壞掉。
      const defaultMeter = { start: 0, end: 0, unitPrice: 0, manualAmount: null };
      setUtility(
        found
          ? { date: found.date, rent: found.rent, elec: found.elec ?? defaultMeter, water: found.water ?? defaultMeter }
          : null
      );
      setCustomItems(customItemsData.items ?? []);
      setTransactions(transactionsData.transactions ?? []);
      setReconciledCardIds(new Set<string>(reconciliationData.cardIds ?? []));
      setSummary(summaryData.summary ?? null);
      setCardBreakdown(
        (summaryData.cards ?? []).map((c: { card: string; name: string; total: number }) => ({
          id: c.card,
          name: c.name,
          total: c.total,
        }))
      );
      setIncomingShares(incomingData.items ?? []);
    } finally {
      dismiss(toastId);
      setLoading(false);
    }
  }, [year, month, period, showLoading, dismiss]);

  useEffect(() => {
    // 等 usePeriod 確定好正確的月份(ready)才 fetch,避免先用猜的月份抓一次資料造成畫面閃爍。
    if (!ready) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, ready]);

  async function toggleReconciled(cardId: string) {
    const next = !reconciledCardIds.has(cardId);
    // 先樂觀更新畫面,失敗機率極低且影響很小,不用等 API 回應才反應。
    setReconciledCardIds((prev) => {
      const updated = new Set(prev);
      if (next) updated.add(cardId);
      else updated.delete(cardId);
      return updated;
    });
    await fetch("/api/card-reconciliations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card: cardId, period, reconciled: next }),
    });
  }

  // 每日支出圖表需要逐筆交易的日期/金額,其餘加總數字一律讀 OverviewSummary 快取,不再自己重算。
  const expenseList = transactions.filter((t) => t.type === "expense");

  const incomeTotal = summary?.income ?? 0;
  const cashTotal = summary?.cash ?? 0;
  const installmentTotal = summary?.installment ?? 0;
  const subscriptionTotal = summary?.subscription ?? 0;
  const utilityCost = summary?.utility ?? 0;
  const customItemsTotal = summary?.customItems ?? 0;
  // 別人分享給我、且我選擇納入支出的項目,只在這裡虛擬加總,不會動到分享者原本的資料。
  const includedSharedTotal = incomingShares.filter((s) => s.included).reduce((sum, s) => sum + s.amount, 0);
  const totalExpense = (summary?.expense ?? 0) + includedSharedTotal;
  const balance = incomeTotal - totalExpense;

  const remainingDays = specialDate != null ? daysUntilSpecialDate(specialDate, new Date())+1 : null;
  const dailyBudget =
    specialDate != null && remainingDays != null ? calculateDailyBudget(balance, remainingDays) : null;
  const showDailyBudget = specialDate != null;

  // x 軸用交易「實際發生日期」(MM/DD,含月份避免歧義),而不是入帳月份裡的第幾天:
  // 分期/信用卡消費常常是上個月的日期被算進這個月的帳單,MM/DD 才能分清楚是哪一天。
  // 範圍取這個月帳單裡所有支出「實際日期」的最早~最晚一天,缺的日期補 0;完全沒有支出時退回顯示整個月份。
  // 分期預設不畫進圖表:分期只是單筆大額消費拆期攤還,畫進「每日支出」曲線容易造成單日突兀尖峰、失去參考意義,
  // 使用者可透過按鈕自行選擇要不要看。
  const chartExpenseList = showInstallmentInChart
    ? expenseList
    : expenseList.filter((t) => t.category !== "installment");
  // 日期範圍一律以全部支出(含分期)計算,只是分期關閉時該日金額歸零,
  // 這樣切換按鈕不會讓 x 軸範圍跳動。
  const expenseByDate = new Map<string, number>();
  const expenseItemsByDate = new Map<string, { item: string; amount: number }[]>();
  for (const t of chartExpenseList) {
    const key = t.date.slice(0, 10);
    expenseByDate.set(key, (expenseByDate.get(key) ?? 0) + t.amount);
    const items = expenseItemsByDate.get(key) ?? [];
    items.push({ item: t.item, amount: t.amount });
    expenseItemsByDate.set(key, items);
  }
  const sortedDateKeys = Array.from(
    new Set(expenseList.map((t) => t.date.slice(0, 10)))
  ).sort();
  const rangeStart =
    sortedDateKeys.length > 0 ? parseISODateToUTC(sortedDateKeys[0]) : Date.UTC(year, month - 1, 1);
  const rangeEnd =
    sortedDateKeys.length > 0
      ? parseISODateToUTC(sortedDateKeys[sortedDateKeys.length - 1])
      : Date.UTC(year, month, 0);
  const dailyExpense: DailyExpense[] = [];
  for (let t = rangeStart; t <= rangeEnd; t += DAY_MS) {
    const key = isoDateKey(t);
    dailyExpense.push({
      label: formatMMDD(t),
      amount: expenseByDate.get(key) ?? 0,
      items: expenseItemsByDate.get(key) ?? [],
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <MonthPicker value={period} onChange={setPeriod} />

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-50">
            <ChartBarIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            {period} 每日支出
          </h2>
          <button
            type="button"
            onClick={() => setShowInstallmentInChart((prev) => !prev)}
            className={`rounded-md border px-3 py-1 text-xs font-medium ${
              showInstallmentInChart
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
            }`}
          >
            {showInstallmentInChart ? "已包含分期" : "包含分期"}
          </button>
        </div>
        <OverviewChart dailyExpense={dailyExpense} />
      </div>

      <UtilityInlineEditor year={year} month={month} utility={utility} loading={loading} onSaved={load} />

      <SharedItemsSection incomingItems={incomingShares} loading={loading} onIncomingChanged={load} />

      {/* <CustomItemsEditor year={year} month={month} items={customItems} loading={loading} onSaved={load} /> */}

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="flex items-center justify-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
              <ArrowUpCircleIcon className="h-4 w-4" />
              收入
            </p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">${incomeTotal.toLocaleString()}</p>
          </div>
          <div>
            <p className="flex items-center justify-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
              <ArrowDownCircleIcon className="h-4 w-4" />
              支出
            </p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">${totalExpense.toLocaleString()}</p>
          </div>
          <div>
            <p className="flex items-center justify-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
              <ScaleIcon className="h-4 w-4" />
              結餘
            </p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">${balance.toLocaleString()}</p>
          </div>
        </div>
        {showDailyBudget && (
          <div className="mb-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="flex items-center justify-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                <ClockIcon className="h-4 w-4" />
                距結算日
              </p>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{remainingDays} 天</p>
            </div>
            <div>
              <p className="flex items-center justify-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                <BanknotesIcon className="h-4 w-4" />
                每日可花
              </p>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {dailyBudget != null ? `$${Math.floor(dailyBudget).toLocaleString()}` : "-"}
              </p>
            </div>
          </div>
        )}

        <hr className="mb-4 border-zinc-200 dark:border-zinc-800" />

        {cardBreakdown.length > 0 && (
          <>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              <CreditCardIcon className="h-4 w-4" />
              信用卡
            </h3>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {cardBreakdown.map((card) => {
                const reconciled = reconciledCardIds.has(card.id);
                return (
                  <div
                    key={card.id}
                    className="rounded-md border border-zinc-200 p-3 text-center dark:border-zinc-800"
                  >
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <p className="flex min-w-0 items-center gap-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
                        <CreditCardIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{card.name}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleReconciled(card.id)}
                        title={
                          reconciled
                            ? "本月帳單已對帳,點擊取消"
                            : "尚未對帳:點擊標記這張卡本月的帳單已經核對完成"
                        }
                        className={`flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
                          reconciled
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60"
                            : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:bg-zinc-700"
                        }`}
                      >
                        {reconciled ? (
                          <>
                            <CheckCircleIcon className="h-3.5 w-3.5" />
                            已對帳
                          </>
                        ) : (
                          <QuestionMarkCircleIcon className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      ${card.total.toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
            <hr className="mb-4 border-zinc-200 dark:border-zinc-800" />
          </>
        )}

        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          其他
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-zinc-200 p-3 text-center dark:border-zinc-800">
            <p className="flex items-center justify-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
              <BanknotesIcon className="h-4 w-4" />
              現金開銷
            </p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">${cashTotal.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-zinc-200 p-3 text-center dark:border-zinc-800">
            <p className="flex items-center justify-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
              <HomeIcon className="h-4 w-4" />
              房租水電總開銷
            </p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">${utilityCost.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-zinc-200 p-3 text-center dark:border-zinc-800">
            <p className="flex items-center justify-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
              <TagIcon className="h-4 w-4" />
              自訂項目總開銷
            </p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">${customItemsTotal.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-zinc-200 p-3 text-center dark:border-zinc-800">
            <p className="flex items-center justify-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
              <CalendarDaysIcon className="h-4 w-4" />
              分期總開銷
            </p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">${installmentTotal.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-zinc-200 p-3 text-center dark:border-zinc-800">
            <p className="flex items-center justify-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
              <ArrowPathIcon className="h-4 w-4" />
              訂閱總開銷
            </p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">${subscriptionTotal.toLocaleString()}</p>
          </div>
          <div
            className="rounded-md border border-dashed border-zinc-300 p-3 text-center dark:border-zinc-700"
            title="虛擬項目:只在這裡合計顯示,不會實際存成一筆支出"
          >
            <p className="flex items-center justify-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
              <UserGroupIcon className="h-4 w-4" />
              共享總開銷(虛擬)
            </p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              ${includedSharedTotal.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      
    </div>
  );
}
