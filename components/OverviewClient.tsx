"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import MonthPicker from "./MonthPicker";
import OverviewChart, { type DailyExpense } from "./OverviewChart";
import UtilityInlineEditor, { type UtilityDTO } from "./UtilityInlineEditor";
import CustomItemsEditor, { type CustomItemDTO } from "./CustomItemsEditor";
import type { TransactionDTO } from "./TransactionsClient";
import { usePeriod } from "@/lib/usePeriod";
import { calculateElecCost } from "@/lib/calculateElecCost";
import { calculateDailyBudget, daysUntilSpecialDate } from "@/lib/calculateDailyBudget";
import { useToast } from "./ToastProvider";

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

const PREVIEW_LIMIT = 5;

function paymentLabel(t: TransactionDTO) {
  return t.category === "cash" ? "現金" : (t.card?.name ?? "信用卡");
}

export default function OverviewClient() {
  const { period, setPeriod, ready } = usePeriod();
  const { showLoading, dismiss } = useToast();
  const [utility, setUtility] = useState<UtilityDTO | null>(null);
  const [customItems, setCustomItems] = useState<CustomItemDTO[]>([]);
  const [transactions, setTransactions] = useState<TransactionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialDate, setSpecialDate] = useState<number | null>(null);

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
      const [utilityRes, customItemsRes, transactionsRes] = await Promise.all([
        fetch(`/api/utilities?year=${year}&month=${month}`),
        fetch(`/api/custom-items?year=${year}&month=${month}`),
        fetch(`/api/transactions?billingPeriod=${period}`),
      ]);
      const utilityData = await utilityRes.json();
      const customItemsData = await customItemsRes.json();
      const transactionsData = await transactionsRes.json();

      const found = utilityData.utilities?.[0];
      setUtility(found ? { date: found.date, rent: found.rent, elec: found.elec } : null);
      setCustomItems(customItemsData.items ?? []);
      setTransactions(transactionsData.transactions ?? []);
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

  const incomeList = transactions.filter((t) => t.type === "income");
  const expenseList = transactions.filter((t) => t.type === "expense");
  const incomeTotal = incomeList.reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = expenseList.reduce((sum, t) => sum + t.amount, 0);

  const rentCost = utility?.rent ?? 0;
  const elecCost = utility ? calculateElecCost(utility.elec) : 0;
  const utilityCost = rentCost + elecCost;
  const customItemsTotal = customItems.reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = expenseTotal + utilityCost + customItemsTotal;
  const balance = incomeTotal - totalExpense;

  const remainingDays = specialDate != null ? daysUntilSpecialDate(specialDate, new Date())+1 : null;
  const dailyBudget =
    specialDate != null && remainingDays != null ? calculateDailyBudget(balance, remainingDays) : null;
  const showDailyBudget = specialDate != null;

  // x 軸用交易「實際發生日期」(MM/DD,含月份避免歧義),而不是入帳月份裡的第幾天:
  // 分期/信用卡消費常常是上個月的日期被算進這個月的帳單,MM/DD 才能分清楚是哪一天。
  // 範圍取這個月帳單裡所有支出「實際日期」的最早~最晚一天,缺的日期補 0;完全沒有支出時退回顯示整個月份。
  const expenseByDate = new Map<string, number>();
  const expenseItemsByDate = new Map<string, { item: string; amount: number }[]>();
  for (const t of expenseList) {
    const key = t.date.slice(0, 10);
    expenseByDate.set(key, (expenseByDate.get(key) ?? 0) + t.amount);
    const items = expenseItemsByDate.get(key) ?? [];
    items.push({ item: t.item, amount: t.amount });
    expenseItemsByDate.set(key, items);
  }
  const sortedDateKeys = Array.from(expenseByDate.keys()).sort();
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
        <h2 className="mb-2 font-medium text-zinc-900 dark:text-zinc-50">{period} 每日支出</h2>
        <OverviewChart dailyExpense={dailyExpense} />
      </div>

      <UtilityInlineEditor year={year} month={month} utility={utility} loading={loading} onSaved={load} />

      <CustomItemsEditor year={year} month={month} items={customItems} loading={loading} onSaved={load} />

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">收入</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">${incomeTotal.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">支出</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">${totalExpense.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">結餘</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">${balance.toLocaleString()}</p>
          </div>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">距結算日</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{remainingDays} 天</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">每日可花</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{dailyBudget != null ? `$${Math.floor(dailyBudget).toLocaleString()}` : "NaN"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href={`/income?period=${period}`}
            className="rounded-md border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
          >
            <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">收入預覽</p>
            {loading && <p className="text-sm text-zinc-500 dark:text-zinc-400">載入中...</p>}
            {!loading && incomeList.length === 0 && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">尚無紀錄</p>
            )}
            <ul className="flex flex-col gap-2">
              {incomeList.slice(0, PREVIEW_LIMIT).map((t) => (
                <li key={t._id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-700 dark:text-zinc-300">{t.item}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      {t.date.slice(5, 7)}/{t.date.slice(8, 10)} · {paymentLabel(t)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
                    ${t.amount.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </Link>

          <Link
            href={`/expense?period=${period}`}
            className="rounded-md border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
          >
            <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">支出預覽</p>
            {loading && <p className="text-sm text-zinc-500 dark:text-zinc-400">載入中...</p>}
            {!loading && expenseList.length === 0 && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">尚無紀錄</p>
            )}
            <ul className="flex flex-col gap-2">
              {expenseList.slice(0, PREVIEW_LIMIT).map((t) => (
                <li key={t._id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-700 dark:text-zinc-300">{t.item}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      {t.date.slice(5, 7)}/{t.date.slice(8, 10)} · {paymentLabel(t)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
                    ${t.amount.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </Link>
        </div>
      </div>
    </div>
  );
}
