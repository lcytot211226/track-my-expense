"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import ConfirmDialog from "./ConfirmDialog";

export type CardDTO = {
  _id: string;
  name: string;
  /** 簽帳金融卡:沒有結帳日 / 繳款日,歸屬月份等同現金(舊資料沒有這個欄位視為 false) */
  isDebit?: boolean;
  closingDate: number | null;
  paymentDate: number | null;
};

const emptyForm = { name: "", isDebit: false, closingDate: "", paymentDate: "" };

export default function CardForm({ initialCards }: { initialCards: CardDTO[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CardDTO | null>(null);

  function startEdit(card: CardDTO) {
    setEditingId(card._id);
    setForm({
      name: card.name,
      isDebit: !!card.isDebit,
      closingDate: card.closingDate != null ? String(card.closingDate) : "",
      paymentDate: card.paymentDate != null ? String(card.paymentDate) : "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = form.isDebit
      ? { name: form.name, isDebit: true }
      : {
          name: form.name,
          isDebit: false,
          closingDate: Number(form.closingDate),
          paymentDate: Number(form.paymentDate),
        };

    const res = await fetch(editingId ? `/api/cards/${editingId}` : "/api/cards", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "儲存失敗");
      return;
    }

    cancelEdit();
    router.refresh();
  }

  function handleDelete(card: CardDTO) {
    setDeleteTarget(card);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/cards/${deleteTarget._id}`, { method: "DELETE" });
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">卡片名稱</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="例如:國泰CUBE卡"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>
        {!form.isDebit && (
          <>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">結帳日</label>
          <input
            type="number"
            min={1}
            max={31}
            required
            value={form.closingDate}
            onChange={(e) => setForm({ ...form, closingDate: e.target.value })}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">繳款日</label>
          <input
            type="number"
            min={1}
            max={31}
            required
            value={form.paymentDate}
            onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>
          </>
        )}

        {/* 卡片類型只能在新增時決定,編輯時鎖住 */}
        <label
          className={`flex items-center gap-2 text-sm text-zinc-700 sm:col-span-4 dark:text-zinc-300 ${editingId ? "opacity-60" : ""}`}
        >
          <input
            type="checkbox"
            checked={form.isDebit}
            disabled={!!editingId}
            onChange={(e) => setForm({ ...form, isDebit: e.target.checked })}
          />
          簽帳金融卡
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {editingId
              ? "(卡片類型新增後無法更改)"
              : "(直接從帳戶扣款,沒有結帳日,依消費日期當月計算,同現金;新增後無法更改)"}
          </span>
        </label>

        {error && <p className="text-sm text-red-600 sm:col-span-4 dark:text-red-400">{error}</p>}

        <div className="flex gap-2 sm:col-span-4">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {editingId ? "更新卡片" : "新增卡片"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
            >
              取消
            </button>
          )}
        </div>
      </form>

      <ul className="flex flex-col gap-2">
        {initialCards.map((card) => (
          <li
            key={card._id}
            className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-50">{card.name}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {card.isDebit ? "簽帳金融卡" : `結帳日 ${card.closingDate} 號 / 繳款日 ${card.paymentDate} 號`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startEdit(card)}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
              >
                編輯
              </button>
              <button
                type="button"
                onClick={() => handleDelete(card)}
                className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 dark:border-red-800 dark:text-red-400"
              >
                刪除
              </button>
            </div>
          </li>
        ))}
        {initialCards.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">尚未新增任何信用卡</p>
        )}
      </ul>

      <ConfirmDialog
        open={!!deleteTarget}
        title="刪除確認"
        message={`確定要刪除「${deleteTarget?.name ?? ""}」這張卡片嗎?`}
        confirmLabel="刪除"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
