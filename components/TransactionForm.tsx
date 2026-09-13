"use client";

import { useRef, useState, type FormEvent } from "react";
import type { CardDTO } from "./CardForm";
import type { TransactionDTO } from "./TransactionsClient";

type TransactionCategory = "installment" | "cash" | "credit_card";

function toDateInputValue(date: string) {
  return date.slice(0, 10);
}

function toLocalDateString(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
}

export default function TransactionForm({
  type,
  cards,
  transaction,
  onSaved,
  onAdded,
  onCancel,
}: {
  type: "income" | "expense";
  cards: CardDTO[];
  transaction?: TransactionDTO;
  /** 編輯既有交易成功後呼叫(通常會關閉表單)。 */
  onSaved: () => void;
  /** 新增交易成功後呼叫(表單會保持開啟,方便連續輸入多筆)。 */
  onAdded?: () => void;
  onCancel?: () => void;
}) {
  const itemInputRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(
    transaction ? toDateInputValue(transaction.date) : toLocalDateString(new Date())
  );
  const [category, setCategory] = useState<TransactionCategory>(
    type === "income" ? "cash" : (transaction?.category ?? "cash")
  );
  const [item, setItem] = useState(transaction?.item ?? "");
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [totalAmount, setTotalAmount] = useState("");
  const [cardId, setCardId] = useState(transaction?.card?._id ?? cards[0]?._id ?? "");
  const [totalNumber, setTotalNumber] = useState(
    transaction?.installmentInfo ? String(transaction.installmentInfo.totalNumber) : "2"
  );
  const [posted, setPosted] = useState(transaction?.posted ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 新增分期:一次輸入總金額+總期數,後端會自動生成每一期,而不是手動輸入單一一期的金額。
  const isCreatingInstallmentGroup = category === "installment" && !transaction;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    if (isCreatingInstallmentGroup) {
      const res = await fetch("/api/transactions/installment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item,
          date,
          card: cardId,
          totalAmount: Number(totalAmount),
          totalNumber: Number(totalNumber),
        }),
      });
      const data = await res.json();

      setSubmitting(false);
      if (!res.ok) {
        setError(data.error ?? "儲存失敗");
        return;
      }

      setItem("");
      setTotalAmount("");
      itemInputRef.current?.focus();
      onAdded?.();
      return;
    }

    const payload = {
      type,
      date,
      category,
      item,
      amount: Number(amount),
      posted,
      card: category === "cash" ? null : cardId,
      installmentInfo:
        category === "installment" && transaction
          ? { currentNumber: transaction.installmentInfo?.currentNumber ?? 1, totalNumber: Number(totalNumber) }
          : null,
    };

    const res = await fetch(transaction ? `/api/transactions/${transaction._id}` : "/api/transactions", {
      method: transaction ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "儲存失敗");
      return;
    }

    if (transaction) {
      onSaved();
      return;
    }

    // 新增成功:保留日期/付款方式等設定,只清掉項目和金額,方便連續輸入下一筆。
    setItem("");
    setAmount("");
    itemInputRef.current?.focus();
    onAdded?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-4 sm:grid-cols-3"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {isCreatingInstallmentGroup ? "第一期日期" : "日期"}
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDate((d) => shiftDate(d, -1))}
            aria-label="前一天"
            className="shrink-0 rounded-md border border-zinc-300 px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            &lt;
          </button>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
          <button
            type="button"
            onClick={() => setDate((d) => shiftDate(d, 1))}
            aria-label="後一天"
            className="shrink-0 rounded-md border border-zinc-300 px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            &gt;
          </button>
        </div>
      </div>

      {type === "expense" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">付款方式</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TransactionCategory)}
            disabled={!!transaction && transaction.category === "installment"}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          >
            <option value="cash">現金</option>
            <option value="credit_card">信用卡(單筆)</option>
            {(!transaction || transaction.category === "installment") && <option value="installment">分期</option>}
          </select>
        </div>
      )}
      {category !== "cash" ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">信用卡</label>
          <select
            required
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          >
            <option value="" disabled>
              請選擇卡片
            </option>
            {cards.map((card) => (
              <option key={card._id} value={card._id}>
                {card.name}
              </option>
            ))}
          </select>
        </div>
      ) : <div></div>}

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">項目</label>
        <input
          ref={itemInputRef}
          required
          value={item}
          onChange={(e) => setItem(e.target.value)}
          placeholder="例如:聚餐"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
      </div>

      {isCreatingInstallmentGroup ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">總金額</label>
          <input
            type="number"
            min={0}
            required
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {category === "installment" ? "這一期金額" : "金額"}
          </label>
          <input
            type="number"
            min={0}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>
      )}

      <div></div>

      {category === "installment" &&
        (isCreatingInstallmentGroup ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">總期數</label>
            <input
              type="number"
              min={1}
              required
              value={totalNumber}
              onChange={(e) => setTotalNumber(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              儲存後會自動建立 {totalNumber || "N"} 筆交易,每期各一筆。
            </p>
          </div>
        ) : (
          <div className="flex items-end">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              第 {transaction?.installmentInfo?.currentNumber} / {transaction?.installmentInfo?.totalNumber} 期
              (期數只能整組刪除重建,無法在此更改)
            </p>
          </div>
        ))}

      {category !== "cash" && !isCreatingInstallmentGroup && (
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={posted} onChange={(e) => setPosted(e.target.checked)} />
            結帳日當下已入帳
          </label>
        </div>
      )}

      {error && <p className="text-sm text-red-600 sm:col-span-3 dark:text-red-400">{error}</p>}

      <div className="flex gap-2 sm:col-span-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {transaction ? "更新交易" : isCreatingInstallmentGroup ? "建立分期" : "新增交易"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
          >
            取消
          </button>
        )}
      </div>
    </form>
  );
}
