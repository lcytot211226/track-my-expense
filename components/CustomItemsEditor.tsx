"use client";

import { useState, type FormEvent } from "react";

export type CustomItemDTO = {
  _id: string;
  name: string;
  amount: number;
};

export default function CustomItemsEditor({
  year,
  month,
  items,
  loading,
  onSaved,
}: {
  year: number;
  month: number;
  items: CustomItemDTO[];
  loading: boolean;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setError(null);

    const res = await fetch("/api/custom-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month, name: name.trim(), amount: Number(amount) || 0 }),
    });
    const data = await res.json();

    setAdding(false);
    if (!res.ok) {
      setError(data.error ?? "新增失敗");
      return;
    }
    setName("");
    setAmount("");
    onSaved();
  }

  function startEdit(item: CustomItemDTO) {
    setEditingId(item._id);
    setEditName(item.name);
    setEditAmount(String(item.amount));
  }

  async function handleEditSave(id: string) {
    if (!editName.trim()) return;
    setSavingEdit(true);
    setError(null);

    const res = await fetch(`/api/custom-items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), amount: Number(editAmount) || 0 }),
    });
    const data = await res.json();

    setSavingEdit(false);
    if (!res.ok) {
      setError(data.error ?? "更新失敗");
      return;
    }
    setEditingId(null);
    onSaved();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/custom-items/${id}`, { method: "DELETE" });
    setDeletingId(null);
    onSaved();
  }

  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div
      className={`rounded-lg border border-zinc-200 bg-white p-4 transition-opacity dark:border-zinc-800 dark:bg-zinc-900 ${loading ? "opacity-60" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-50">自訂項目</h2>
        {total > 0 && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">合計 ${total.toLocaleString()}</span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
          這個月還沒有自訂項目,例如孝親費,可以自行新增,不是每個月都要有。
        </p>
      ) : (
        <ul className="mb-4 flex flex-col gap-2">
          {items.map((item) =>
            editingId === item._id ? (
              <li key={item._id} className="flex flex-wrap items-center gap-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
                <input
                  type="number"
                  min={0}
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-24 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => handleEditSave(item._id)}
                  className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  儲存
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                >
                  取消
                </button>
              </li>
            ) : (
              <li
                key={item._id}
                className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">{item.name}</span>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">${item.amount.toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
                  >
                    編輯
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === item._id}
                    onClick={() => handleDelete(item._id)}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                  >
                    刪除
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">項目名稱</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如 孝親費"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>
        <div className="w-28">
          <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">金額</label>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>
        <button
          type="submit"
          disabled={adding || !name.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {adding ? "新增中..." : "新增"}
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
