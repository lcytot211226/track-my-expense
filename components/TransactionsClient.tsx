"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import type { CardDTO } from "./CardForm";
import TransactionForm from "./TransactionForm";
import MonthPicker from "./MonthPicker";
import ConfirmDialog from "./ConfirmDialog";
import Modal from "./Modal";
import {
  ArrowDownIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ListIcon,
  Columns2Icon,
  Columns3Icon,
} from "./icons";
import { useSearchParams } from "next/navigation";
import { usePeriod } from "@/lib/usePeriod";
import { netAmount } from "@/lib/pointsDiscount";

export type TransactionDTO = {
  _id: string;
  type: "income" | "expense";
  date: string;
  category: "installment" | "cash" | "credit_card";
  item: string;
  card: CardDTO | null;
  installmentInfo: { currentNumber: number; totalNumber: number } | null;
  amount: number;
  /** 點數折抵,只有信用卡單筆支出且有折抵時才有 */
  pointsDiscount?: number;
  posted: boolean;
  billingPeriod: string;
  subscription: string | null;
  createdAt: string;
};

type Columns = 1 | 2 | 3;

const COLUMNS_STORAGE_KEY = "transactionColumns";

const COLUMN_OPTIONS: { value: Columns; label: string; Icon: typeof ListIcon }[] = [
  { value: 1, label: "列表", Icon: ListIcon },
  { value: 2, label: "2 欄", Icon: Columns2Icon },
  { value: 3, label: "3 欄", Icon: Columns3Icon },
];

type SortKey = "date" | "amount";
type SortDir = "desc" | "asc";

const SORT_STORAGE_KEY = "transactionSort";

const SORT_OPTIONS: { value: SortKey; label: string; Icon: typeof ListIcon }[] = [
  { value: "date", label: "日期", Icon: CalendarDaysIcon },
  { value: "amount", label: "金額", Icon: BanknotesIcon },
];

function sortLabel(key: SortKey, dir: SortDir) {
  if (key === "date") return dir === "desc" ? "日期:新到舊" : "日期:舊到新";
  return dir === "desc" ? "金額:高到低" : "金額:低到高";
}

// 手機一律單欄,sm 以上才套用 2 欄,3 欄要到 lg 才展開,避免卡片被擠得太窄。
const GRID_CLASS: Record<Columns, string> = {
  1: "flex flex-col gap-2",
  2: "grid grid-cols-1 gap-2 sm:grid-cols-2",
  3: "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3",
};

const CATEGORY_VALUES = ["cash", "credit_card", "installment"] as const;

/**
 * 從網址 query 讀出初始篩選:`?category=cash|credit_card|installment&card=<cardId>&q=<關鍵字>`
 * (月份 `?period=` 由 usePeriod 處理)。不合法的值直接忽略;只帶 card 時視為信用卡篩選;
 * 收入一律是現金,不吃 category / card。
 */
function readInitialFilters(searchParams: URLSearchParams, type: "income" | "expense", cards: CardDTO[]) {
  const q = searchParams.get("q") ?? "";
  if (type === "income") return { category: "", card: "", q };
  const rawCategory = searchParams.get("category") ?? "";
  const rawCard = searchParams.get("card") ?? "";
  let category = (CATEGORY_VALUES as readonly string[]).includes(rawCategory) ? rawCategory : "";
  let card = cards.some((c) => c._id === rawCard) ? rawCard : "";
  if (card && !category) category = "credit_card";
  if (category === "cash") card = "";
  return { category, card, q };
}

const CATEGORY_LABEL: Record<TransactionDTO["category"], string> = {
  cash: "現金",
  credit_card: "信用卡",
  installment: "分期",
};

export default function TransactionsClient({
  type,
  initialCards,
  refreshToken,
  actions,
}: {
  type: "income" | "expense";
  initialCards: CardDTO[];
  /** 由外層在訂閱新增/編輯/刪除後帶入不同的值,觸發重新讀取交易列表。 */
  refreshToken?: number;
  /** 顯示在「新增{label}」按鈕旁邊的額外按鈕(例如訂閱相關操作)。 */
  actions?: ReactNode;
}) {
  const { period, setPeriod, ready } = usePeriod();
  const searchParams = useSearchParams();
  const [initialFilters] = useState(() => readInitialFilters(searchParams, type, initialCards));
  const [category, setCategory] = useState(initialFilters.category);
  const [cardFilter, setCardFilter] = useState(initialFilters.card);
  const [search, setSearch] = useState(initialFilters.q);
  const [columns, setColumns] = useState<Columns>(1);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [transactions, setTransactions] = useState<TransactionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TransactionDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TransactionDTO | null>(null);

  const showCardFilter = category === "credit_card" || category === "installment";

  function handleCategoryChange(next: string) {
    setCategory(next);
    if (next !== "credit_card" && next !== "installment") {
      setCardFilter("");
    }
  }

  // 只依月份向 API 抓當月全部資料;付款方式、信用卡篩選都在前端做,切換篩選不會重新打 API。
  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ type, billingPeriod: period });
    const res = await fetch(`/api/transactions?${params.toString()}`);
    const data = await res.json();
    setTransactions(data.transactions ?? []);
    setLoading(false);
  }, [type, period]);

  useEffect(() => {
    // 等 usePeriod 確定好正確的月份(ready)才 fetch,避免先用猜的月份抓一次資料造成畫面閃爍。
    if (!ready) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, ready, refreshToken]);

  useEffect(() => {
    // 讀取上次選擇的顯示方式(外部系統 localStorage),僅在掛載時同步一次。
    try {
      const stored = Number(window.localStorage.getItem(COLUMNS_STORAGE_KEY));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === 1 || stored === 2 || stored === 3) setColumns(stored);
      const [key, dir] = (window.localStorage.getItem(SORT_STORAGE_KEY) ?? "").split(":");
      if ((key === "date" || key === "amount") && (dir === "desc" || dir === "asc")) {
        setSortKey(key);
        setSortDir(dir);
      }
    } catch {}
  }, []);

  function saveSort(key: SortKey, dir: SortDir) {
    setSortKey(key);
    setSortDir(dir);
    try {
      window.localStorage.setItem(SORT_STORAGE_KEY, `${key}:${dir}`);
    } catch {}
  }

  function handleColumnsChange(next: Columns) {
    setColumns(next);
    try {
      window.localStorage.setItem(COLUMNS_STORAGE_KEY, String(next));
    } catch {}
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  function handleDelete(t: TransactionDTO) {
    setDeleteTarget(t);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/transactions/${deleteTarget._id}`, { method: "DELETE" });
    setDeleteTarget(null);
    load();
  }

  // 付款方式篩選:跟 API 的規則一致,選「信用卡」時一併包含分期(分期本質上也是刷卡)。
  const categoryFiltered = transactions.filter((t) => {
    if (category === "credit_card") {
      if (t.category !== "credit_card" && t.category !== "installment") return false;
    } else if (category && t.category !== category) {
      return false;
    }
    if (showCardFilter && cardFilter && t.card?._id !== cardFilter) return false;
    return true;
  });
  // 名稱搜尋只在前端過濾已載入的當月資料,不另外打 API。
  // 可用逗號(半形/全形/頓號)分隔多個關鍵字,名稱符合任一個就顯示。
  const keywords = search
    .split(/[,，、]/)
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  const keyword = keywords.length > 0;
  const filteredTransactions = keyword
    ? categoryFiltered.filter((t) => {
        const name = t.item.toLowerCase();
        return keywords.some((k) => name.includes(k));
      })
    : categoryFiltered;
  // 排序同樣只在前端做。日期排序:同一天再依建立時間(跟主排序同方向),讓同日的紀錄維持輸入順序;
  // 金額排序:金額相同時依日期、再依建立時間(新到舊)。
  const sign = sortDir === "desc" ? -1 : 1;
  const visibleTransactions = [...filteredTransactions].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    const byCreated = (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
    const byAmount = netAmount(a) - netAmount(b);
    return sortKey === "date"
      ? sign * (byDate || byCreated)
      : sign * byAmount || -byDate || -byCreated;
  });
  const total = visibleTransactions.reduce((sum, t) => sum + netAmount(t), 0);
  const label = type === "income" ? "收入" : "支出";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <MonthPicker value={period} onChange={setPeriod} />
          {/* 收入一律是現金(見 TransactionForm),付款方式篩選沒有意義,只在支出顯示 */}
          {type === "expense" && (
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            >
              <option value="">全部付款方式</option>
              <option value="cash">現金</option>
              <option value="credit_card">信用卡</option>
              <option value="installment">分期</option>
            </select>
          )}
          {showCardFilter && (
            <select
              value={cardFilter}
              onChange={(e) => setCardFilter(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            >
              <option value="">全部信用卡</option>
              {initialCards.map((card) => (
                <option key={card._id} value={card._id}>
                  {card.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            新增{label}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋名稱,可用逗號分隔多個關鍵字"
          className="w-full flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
        <div className="flex items-center justify-between gap-3 sm:justify-start">
          <div
            role="group"
            aria-label={`排序方式(目前${sortLabel(sortKey, sortDir)})`}
            className="flex shrink-0 items-center gap-0.5 rounded-md border border-zinc-300 p-0.5 dark:border-zinc-700"
          >
            {SORT_OPTIONS.map((opt) => {
              const active = sortKey === opt.value;
              // 點目前已選的欄位也會反轉方向,效果同旁邊的箭頭;點另一個欄位則沿用目前方向
              const title = active ? `${sortLabel(opt.value, sortDir)},點擊反轉` : `依${opt.label}排序`;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    saveSort(opt.value, active ? (sortDir === "desc" ? "asc" : "desc") : sortDir)
                  }
                  aria-pressed={active}
                  aria-label={title}
                  title={title}
                  className={`flex items-center justify-center rounded px-2 py-1.5 transition-colors duration-300 active:scale-90 motion-reduce:transition-none ${
                    active
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  }`}
                >
                  <opt.Icon className="h-5 w-5" />
                </button>
              );
            })}
            <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-zinc-300 dark:bg-zinc-700" />
            {/* 兩個欄位共用的方向切換:向下 = 高到低 / 新到舊,向上 = 低到高 / 舊到新 */}
            <button
              type="button"
              onClick={() => saveSort(sortKey, sortDir === "desc" ? "asc" : "desc")}
              aria-label={`${sortLabel(sortKey, sortDir)},點擊反轉`}
              title={`${sortLabel(sortKey, sortDir)},點擊反轉`}
              className="flex items-center justify-center rounded px-2 py-1.5 text-zinc-700 hover:bg-zinc-100 active:scale-90 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <ArrowDownIcon
                className={`h-5 w-5 transition-transform duration-300 motion-reduce:transition-none ${
                  sortDir === "asc" ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
          {/* 手機一律單欄(見 GRID_CLASS),切換鈕沒作用,直接隱藏 */}
          <div
            role="group"
            aria-label="顯示方式"
            className="relative hidden shrink-0 grid-cols-3 sm:grid rounded-md border border-zinc-300 p-0.5 dark:border-zinc-700"
          >
            {/* 滑動的選取底色:寬度固定 1/3,依目前選項往右平移,切換時會滑過去。 */}
            <span
              aria-hidden="true"
              className="absolute inset-y-0.5 left-0.5 w-[calc((100%-0.25rem)/3)] rounded bg-zinc-900 transition-transform duration-300 ease-out motion-reduce:transition-none dark:bg-zinc-100"
              style={{ transform: `translateX(${(columns - 1) * 100}%)` }}
            />
            {COLUMN_OPTIONS.map((opt) => {
              const active = columns === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleColumnsChange(opt.value)}
                  aria-pressed={active}
                  aria-label={opt.label}
                  title={opt.label}
                  className={`relative z-10 flex items-center justify-center rounded px-3 py-1.5 transition-colors duration-300 active:scale-90 motion-reduce:transition-none ${
                    active
                      ? "text-white dark:text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  }`}
                >
                  <opt.Icon
                    className={`h-5 w-5 transition-transform duration-300 motion-reduce:transition-none ${
                      active ? "scale-110" : "scale-100"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Modal open={showForm || !!editing} onClose={closeForm} title={editing ? `編輯${label}` : `新增${label}`}>
        <TransactionForm
          key={editing ? editing._id : "new"}
          type={type}
          cards={initialCards}
          transaction={editing ?? undefined}
          onSaved={() => {
            closeForm();
            load();
          }}
          onAdded={load}
          onCancel={closeForm}
        />
      </Modal>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {period} {label}總額{keyword ? `(符合「${search.trim()}」)` : ""}
        </p>
        <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">${total.toLocaleString()}</p>
      </div>

      <ul className={GRID_CLASS[columns]}>
        {loading && <p className="col-span-full text-sm text-zinc-500 dark:text-zinc-400">載入中...</p>}
        {!loading && transactions.length === 0 && (
          <p className="col-span-full text-sm text-zinc-500 dark:text-zinc-400">這個月份還沒有{label}紀錄</p>
        )}
        {!loading && transactions.length > 0 && categoryFiltered.length === 0 && (
          <p className="col-span-full text-sm text-zinc-500 dark:text-zinc-400">沒有符合篩選條件的{label}</p>
        )}
        {!loading && categoryFiltered.length > 0 && visibleTransactions.length === 0 && (
          <p className="col-span-full text-sm text-zinc-500 dark:text-zinc-400">找不到名稱符合「{search.trim()}」的{label}</p>
        )}
        {visibleTransactions.map((t) => (
          <li
            key={t._id}
            className={`flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 ${
              columns === 1 ? "sm:flex-row sm:items-center sm:justify-between" : "justify-between"
            }`}
          >
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-50">{t.item}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {t.date.slice(0, 10)} · {CATEGORY_LABEL[t.category]}
                {t.card ? ` · ${t.card.name}` : ""}
                {t.installmentInfo ? ` · 第${t.installmentInfo.currentNumber}/${t.installmentInfo.totalNumber}期` : ""}
                {!t.posted ? " · 未入帳" : ""}
                {t.subscription ? " · 訂閱" : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="mr-auto font-medium text-zinc-900 dark:text-zinc-50">
                ${netAmount(t).toLocaleString()}
                {t.pointsDiscount ? (
                  <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                    ${t.amount.toLocaleString()} − 點數 ${t.pointsDiscount.toLocaleString()}
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(t);
                }}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
              >
                編輯
              </button>
              <button
                type="button"
                onClick={() => handleDelete(t)}
                className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 dark:border-red-800 dark:text-red-400"
              >
                刪除
              </button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={!!deleteTarget}
        title="刪除確認"
        message={
          deleteTarget?.installmentInfo
            ? `這是分期交易(共 ${deleteTarget.installmentInfo.totalNumber} 期),刪除會把全部 ${deleteTarget.installmentInfo.totalNumber} 期一起刪掉,確定嗎?`
            : "確定要刪除這筆交易嗎?"
        }
        confirmLabel="刪除"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
