"use client";

import { useEffect, useState, useCallback } from "react";
import type { CardDTO } from "./CardForm";
import TransactionForm from "./TransactionForm";
import MonthPicker from "./MonthPicker";
import ConfirmDialog from "./ConfirmDialog";
import Modal from "./Modal";
import { usePeriod } from "@/lib/usePeriod";

export type TransactionDTO = {
  _id: string;
  type: "income" | "expense";
  date: string;
  category: "installment" | "cash" | "credit_card";
  item: string;
  card: CardDTO | null;
  installmentInfo: { currentNumber: number; totalNumber: number } | null;
  amount: number;
  posted: boolean;
  billingPeriod: string;
};

const CATEGORY_LABEL: Record<TransactionDTO["category"], string> = {
  cash: "現金",
  credit_card: "信用卡",
  installment: "分期",
};

export default function TransactionsClient({
  type,
  initialCards,
}: {
  type: "income" | "expense";
  initialCards: CardDTO[];
}) {
  const { period, setPeriod, ready } = usePeriod();
  const [category, setCategory] = useState("");
  const [cardFilter, setCardFilter] = useState("");
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

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ type, billingPeriod: period });
    if (category) params.set("category", category);
    if (showCardFilter && cardFilter) params.set("card", cardFilter);
    const res = await fetch(`/api/transactions?${params.toString()}`);
    const data = await res.json();
    setTransactions(data.transactions ?? []);
    setLoading(false);
  }, [type, period, category, cardFilter, showCardFilter]);

  useEffect(() => {
    // 等 usePeriod 確定好正確的月份(ready)才 fetch,避免先用猜的月份抓一次資料造成畫面閃爍。
    if (!ready) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, ready]);

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

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const label = type === "income" ? "收入" : "支出";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <MonthPicker value={period} onChange={setPeriod} />
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
          {period} {label}總額
        </p>
        <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">${total.toLocaleString()}</p>
      </div>

      <ul className="flex flex-col gap-2">
        {loading && <p className="text-sm text-zinc-500 dark:text-zinc-400">載入中...</p>}
        {!loading && transactions.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">這個月份還沒有{label}紀錄</p>
        )}
        {transactions.map((t) => (
          <li
            key={t._id}
            className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-50">{t.item}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {t.date.slice(0, 10)} · {CATEGORY_LABEL[t.category]}
                {t.card ? ` · ${t.card.name}` : ""}
                {t.installmentInfo ? ` · 第${t.installmentInfo.currentNumber}/${t.installmentInfo.totalNumber}期` : ""}
                {!t.posted ? " · 未入帳" : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium text-zinc-900 dark:text-zinc-50">${t.amount.toLocaleString()}</span>
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
