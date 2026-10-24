"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import MonthPicker from "./MonthPicker";
import OverviewChart, { type DailyExpense } from "./OverviewChart";
import QuickAddButton from "./QuickAddButton";
import YearOverview from "./YearOverview";
import UtilityInlineEditor, { toUtilityDTO, type UtilityDTO } from "./UtilityInlineEditor";
import CustomItemsEditor, { type CustomItemDTO } from "./CustomItemsEditor";
import PiggyBankTile from "./PiggyBankTile";
import SpecialDatePrompt from "./SpecialDatePrompt";
import SharedItemsSection, { type IncomingShareDTO } from "./SharedItemsSection";
import type { TransactionDTO } from "./TransactionsClient";
import { usePeriod } from "@/lib/usePeriod";
import { calculateDailyBudget, daysUntilSpecialDate } from "@/lib/calculateDailyBudget";
import { includedSharedTotals } from "@/lib/overviewItems";
import { summarizeMonth } from "@/lib/summarizeMonth";
import type { CardDTO } from "./CardForm";
import { useToast } from "./ToastProvider";
import type { CardReconciliationStatus } from "@/lib/models/CardReconciliation";
import { netAmount } from "@/lib/pointsDiscount";
import { writeCachedCards } from "@/lib/cardsCache";
import {
  ArrowDownCircleIcon,
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
  const [piggyBankAmount, setPiggyBankAmount] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<TransactionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialDate, setSpecialDate] = useState<number | null>(null);
  // /api/auth/me 回來前不知道有沒有設定,先什麼都不顯示,避免設定提示閃一下
  const [specialDateLoaded, setSpecialDateLoaded] = useState(false);
  const [showInstallmentInChart, setShowInstallmentInChart] = useState(false);
  // 共享總額是否要實際計入上方收入/支出/結餘統計,讓使用者自己決定,預設納入。
  const [includeSharedInStats, setIncludeSharedInStats] = useState(true);
  // 各卡本月對帳進度,沒出現在裡面的卡 = 未對帳
  const [cardStatuses, setCardStatuses] = useState<Record<string, CardReconciliationStatus>>({});
  const [cards, setCards] = useState<CardDTO[]>([]);
  // 第一次載入完成前,快速記帳先用 localStorage 快取的卡片清單
  const [cardsLoaded, setCardsLoaded] = useState(false);
  const [incomingShares, setIncomingShares] = useState<IncomingShareDTO[]>([]);
  // 月 / 年檢視切換;年檢視看的年份獨立於 period,切年份不會觸發月檢視重新載入
  const [view, setView] = useState<"month" | "year">("month");
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());

  const { year, month } = parsePeriod(period);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setSpecialDate(typeof data.specialDate === "number" ? data.specialDate : null);
        setSpecialDateLoaded(true);
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const toastId = showLoading("資料載入中…");
    try {
      // 總覽專用的資料(房租水電 / 自訂項目 / 對帳狀態 / 別人分享給我的項目)由 /api/overview 一次拿;
      // 交易與卡片其他頁面也會獨立使用,維持各自的 API。
      const [overviewRes, transactionsRes, cardsRes] = await Promise.all([
        fetch(`/api/overview?period=${period}`),
        fetch(`/api/transactions?billingPeriod=${period}`),
        // 卡片清單用來列出這個月完全沒刷卡的卡($0)
        fetch("/api/cards"),
      ]);
      const overviewData = await readJson(overviewRes);
      const transactionsData = await readJson(transactionsRes);
      const cardsData = await readJson(cardsRes);

      setUtility(overviewData.utility ? toUtilityDTO(overviewData.utility) : null);
      setCustomItems(overviewData.customItems ?? []);
      setPiggyBankAmount(overviewData.piggyBankAmount ?? null);
      setTransactions(transactionsData.transactions ?? []);
      setCardStatuses(overviewData.cardStatuses ?? {});
      if (cardsRes.ok) {
        const freshCards: CardDTO[] = cardsData.cards ?? [];
        setCards(freshCards);
        setCardsLoaded(true);
        writeCachedCards(freshCards);
      }
      setIncomingShares(overviewData.incomingShares ?? []);
    } finally {
      dismiss(toastId);
      setLoading(false);
    }
  }, [period, showLoading, dismiss]);

  useEffect(() => {
    // 等 usePeriod 確定好正確的月份(ready)才 fetch,避免先用猜的月份抓一次資料造成畫面閃爍。
    if (!ready) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, ready]);

  /** 點一下依序切換:未對帳 → 已對帳 → 已繳費 → 未對帳 */
  async function cycleCardStatus(cardId: string) {
    const current = cardStatuses[cardId] ?? null;
    const next: CardReconciliationStatus | null =
      current === null ? "reconciled" : current === "reconciled" ? "paid" : null;
    // 先樂觀更新畫面,失敗機率極低且影響很小,不用等 API 回應才反應。
    setCardStatuses((prev) => {
      const updated = { ...prev };
      if (next) updated[cardId] = next;
      else delete updated[cardId];
      return updated;
    });
    await fetch("/api/card-reconciliations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card: cardId, period, status: next }),
    });
  }

  // 快速記帳新增後直接併進本地列表(只留歸屬這個月份的,例如分期只會有一期),
  // 總覽的數字都是用 transactions 現場算的,不用重打 API。
  function handleQuickAdded(added: TransactionDTO[]) {
    const visible = added.filter((t) => t.billingPeriod === period);
    if (visible.length > 0) setTransactions((prev) => [...prev, ...visible]);
  }

  const expenseList = transactions.filter((t) => t.type === "expense");

  // 所有加總數字都用剛抓回來的原始資料現場算,不讀任何快取。
  // 交易列表 API 回傳前已經補生成到期的訂閱,所以這裡算出來的一定包含最新的訂閱扣款。
  const summary = summarizeMonth({
    transactions: transactions.map((t) => ({
      type: t.type,
      category: t.category,
      amount: netAmount(t),
      subscription: t.subscription,
      cardId: t.card?._id ?? null,
    })),
    utility,
    customItems,
    piggyBankAmount,
  });
  const cashTotal = summary.cash;
  const installmentTotal = summary.installment;
  const subscriptionTotal = summary.subscription;
  const utilityCost = summary.utility;
  const customItemsTotal = summary.customItems;
  // 每張卡都列出來,這個月完全沒刷卡的卡顯示 $0
  const cardTotalById = new Map(summary.cards.map((c) => [c.card, c.total]));
  const cardBreakdown = cards.map((c) => ({
    id: c._id,
    name: c.name,
    isDebit: !!c.isDebit,
    total: cardTotalById.get(c._id) ?? 0,
  }));
  const cardsTotal = cardBreakdown.reduce((sum, c) => sum + c.total, 0);
  // 別人分享給我、且我選擇納入的項目,只在這裡虛擬加總,不會動到分享者原本的資料。
  // 收入與支出分開加:收入項目加進收入、開銷類加進支出,結餘則是分享者的收入和支出都抓(規則見 includedSharedTotals)。
  const sharedTotals = includedSharedTotals(incomingShares.map((s) => ({ ...s, owner: s.ownerEmail })));
  const sharedIncomeAdjustment = includeSharedInStats ? sharedTotals.income : 0;
  const sharedExpenseAdjustment = includeSharedInStats ? sharedTotals.expense : 0;
  const incomeTotal = summary.income + sharedIncomeAdjustment;
  // 存錢罐存下的金額已經由 summarizeMonth 算進 summary.expense(只看自己的結餘,不受共享項目影響)。
  // 存錢罐格子的預覽要用「存錢前」的自己結餘。
  const balanceBeforeSaving = summary.balance + summary.piggyBank;
  const totalExpense = summary.expense + sharedExpenseAdjustment;
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
    : expenseList.filter((t) => t.category !== "installment" && t.subscription === null);
  // 日期範圍一律以全部支出(含分期)計算,只是分期關閉時該日金額歸零,
  // 這樣切換按鈕不會讓 x 軸範圍跳動。
  const expenseByDate = new Map<string, number>();
  const expenseItemsByDate = new Map<string, { item: string; amount: number }[]>();
  for (const t of chartExpenseList) {
    const key = t.date.slice(0, 10);
    expenseByDate.set(key, (expenseByDate.get(key) ?? 0) + netAmount(t));
    const items = expenseItemsByDate.get(key) ?? [];
    items.push({ item: t.item, amount: netAmount(t) });
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

  const viewToggle = (
    <div
      role="group"
      aria-label="檢視範圍"
      className="grid shrink-0 grid-cols-2 gap-1 rounded-md border border-zinc-300 p-0.5 text-sm dark:border-zinc-700"
    >
      {(
        [
          { value: "month", label: "月" },
          { value: "year", label: "年" },
        ] as const
      ).map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => {
            if (opt.value === "year" && view !== "year") setViewYear(year);
            setView(opt.value);
          }}
          aria-pressed={view === opt.value}
          className={`rounded px-3 py-1.5 font-medium ${
            view === opt.value
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 dark:text-zinc-300"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  if (view === "year") {
    return (
      <YearOverview
        year={viewYear}
        onYearChange={setViewYear}
        onSelectMonth={(p) => {
          setPeriod(p);
          setView("month");
        }}
        headerRight={viewToggle}
      />
    );
  }

  return (
    // 手機版底部多留空間,避免右下角的快速記帳按鈕蓋住最後一個區塊
    <div className="flex flex-col gap-6 pb-20 sm:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthPicker value={period} onChange={setPeriod} />
        {viewToggle}
      </div>

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
            {showInstallmentInChart ? "已包含分期訂閱" : "包含分期訂閱"}
          </button>
        </div>
        <OverviewChart dailyExpense={dailyExpense} />
      </div>

      <UtilityInlineEditor
        year={year}
        month={month}
        utility={utility}
        loading={loading}
        onSaved={setUtility}
        onPaidChange={(paid) => setUtility((prev) => (prev ? { ...prev, paid } : prev))}
      />

      
      <CustomItemsEditor year={year} month={month} items={customItems} loading={loading} onSaved={setCustomItems} />

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
        {/* 沒設定月結算日的人多半不知道有每日可花預算這功能,直接在這裡提示並讓他們設定 */}
        {specialDateLoaded && !showDailyBudget && <SpecialDatePrompt onSaved={setSpecialDate} />}

        <hr className="mb-4 border-zinc-200 dark:border-zinc-800" />

        {cardBreakdown.length > 0 && (
          <>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                <CreditCardIcon className="h-4 w-4" />
                信用卡
              </h3>
              {/* 所有卡片本月刷卡金額合計(含分期),點擊導到支出頁的信用卡篩選 */}
              <Link
                href={`/expense?${new URLSearchParams({ period, category: "credit_card" })}`}
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                合計{" "}
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">${cardsTotal.toLocaleString()}</span>
              </Link>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {cardBreakdown.map((card) => {
                const status = cardStatuses[card.id] ?? null;
                return (
                  <div
                    key={card.id}
                    className="relative rounded-md border border-zinc-200 p-3 text-center transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                  >
                    {/* 整張卡片可點,導到支出頁並帶入這張卡的篩選;對帳狀態按鈕疊在上面(z-10)維持各自的點擊行為 */}
                    <Link
                      href={`/expense?${new URLSearchParams({ period, category: "credit_card", card: card.id })}`}
                      aria-label={`查看 ${card.name} 的支出明細`}
                      className="absolute inset-0 rounded-md"
                    />
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <p className="flex min-w-0 items-center gap-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
                        {card.isDebit ? (
                          // 簽帳金融卡:同一個信用卡圖示塗成紫色(CSS 的 fill 會蓋過 svg 上的 fill="none")
                          <span title="簽帳金融卡" className="shrink-0">
                            <CreditCardIcon className="h-3.5 w-3.5 fill-violet-100 text-violet-600 dark:fill-violet-900/60 dark:text-violet-400" />
                          </span>
                        ) : (
                          <CreditCardIcon className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span className="truncate">{card.name}</span>
                      </p>
                      {/* 簽帳金融卡沒有帳單,不需要對帳 */}
                      {!card.isDebit && (
                        <button
                          type="button"
                          onClick={() => cycleCardStatus(card.id)}
                          title={
                            status === "paid"
                              ? "本月帳單已繳費,點擊重設為未對帳"
                              : status === "reconciled"
                                ? "本月帳單已對帳,點擊標記為已繳費"
                                : "尚未對帳:點擊標記這張卡本月的帳單已經核對完成"
                          }
                          className={`relative z-10 flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
                            status === "paid"
                              ? "bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-400 dark:hover:bg-sky-900/60"
                              : status === "reconciled"
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60"
                                : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:bg-zinc-700"
                          }`}
                        >
                          {status === "paid" ? (
                            <>
                              <BanknotesIcon className="h-3.5 w-3.5" />
                              已繳費
                            </>
                          ) : status === "reconciled" ? (
                            <>
                              <CheckCircleIcon className="h-3.5 w-3.5" />
                              已對帳
                            </>
                          ) : (
                            <QuestionMarkCircleIcon className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
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
          <div
            className="rounded-md border border-zinc-200 p-3 text-center dark:border-zinc-800"
            title={`分期 $${installmentTotal.toLocaleString()} · 訂閱 $${subscriptionTotal.toLocaleString()}`}
          >
            <p className="flex items-center justify-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
              <CalendarDaysIcon className="h-4 w-4" />
              分期 / 訂閱
            </p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              ${(installmentTotal + subscriptionTotal).toLocaleString()}
            </p>
          </div>
          <PiggyBankTile
            period={period}
            amount={piggyBankAmount}
            balance={balanceBeforeSaving}
            onChange={setPiggyBankAmount}
          />
          <button
            type="button"
            onClick={() => setIncludeSharedInStats((prev) => !prev)}
            title="點擊切換是否計入上方統計:別人分享給我、且勾選納入的項目,收入 / 支出分開合計(結餘 = 對方的收入和支出都算),不會實際存成一筆交易。開啟時分別加進上方的收入與支出。"
            className="relative w-full rounded-md border border-dashed border-zinc-300 p-3 text-center dark:border-zinc-700"
          >
            <span
              className={`absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full ${
                includeSharedInStats ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
              }`}
            />
            <p className="flex items-center justify-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
              <UserGroupIcon className="h-4 w-4" />
              共享收入 / 支出
            </p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              ${sharedTotals.income.toLocaleString()} / ${sharedTotals.expense.toLocaleString()}
            </p>
          </button>
        </div>
      </div>
      <SharedItemsSection incomingItems={incomingShares} loading={loading} onIncomingChanged={setIncomingShares} />

      <QuickAddButton cards={cardsLoaded ? cards : null} onAdded={handleQuickAdded} />

      
    </div>
  );
}
