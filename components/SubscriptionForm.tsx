"use client";

import { useState, type FormEvent } from "react";
import type { CardDTO } from "./CardForm";
import type { SubscriptionDTO } from "./SubscriptionsClient";

type SubscriptionCategory = "cash" | "credit_card";

function toDateInputValue(date: string) {
  return date.slice(0, 10);
}

function toLocalDateString(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function SubscriptionForm({
  cards,
  subscription,
  onSaved,
  onCancel,
}: {
  cards: CardDTO[];
  subscription?: SubscriptionDTO;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [item, setItem] = useState(subscription?.item ?? "");
  const [amount, setAmount] = useState(subscription ? String(subscription.amount) : "");
  const [category, setCategory] = useState<SubscriptionCategory>(subscription?.category ?? "cash");
  const [cardId, setCardId] = useState(subscription?.card?._id ?? cards[0]?._id ?? "");
  const [startDate, setStartDate] = useState(
    subscription ? toDateInputValue(subscription.startDate) : toLocalDateString(new Date())
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      item,
      amount: Number(amount),
      category,
      card: category === "cash" ? null : cardId,
      startDate,
    };

    const res = await fetch(subscription ? `/api/subscriptions/${subscription._id}` : "/api/subscriptions", {
      method: subscription ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "儲存失敗");
      return;
    }

    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">項目</label>
        <input
          required
          value={item}
          onChange={(e) => setItem(e.target.value)}
          placeholder="例如:Netflix"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">每期金額</label>
        <input
          type="number"
          min={0}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">付款方式</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as SubscriptionCategory)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        >
          <option value="cash">現金</option>
          <option value="credit_card">信用卡</option>
        </select>
      </div>
      {category === "credit_card" ? (
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
      ) : (
        <div />
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">首次扣款日</label>
        <input
          type="date"
          required
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          之後每月同一天(短月自動夾到月底)會自動補記一筆,不用手動輸入每期。
        </p>
      </div>

      {error && <p className="text-sm text-red-600 sm:col-span-2 dark:text-red-400">{error}</p>}

      <div className="flex gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {subscription ? "更新訂閱" : "新增訂閱"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
        >
          取消
        </button>
      </div>
    </form>
  );
}
