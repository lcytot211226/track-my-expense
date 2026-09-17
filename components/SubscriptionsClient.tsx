"use client";

import { useState } from "react";
import type { CardDTO } from "./CardForm";
import SubscriptionForm from "./SubscriptionForm";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";

export type SubscriptionDTO = {
  _id: string;
  item: string;
  amount: number;
  category: "cash" | "credit_card";
  card: CardDTO | null;
  startDate: string;
  lastGeneratedDate: string | null;
};

export default function SubscriptionsClient({
  initialCards,
  initialSubscriptions,
  onChanged,
}: {
  initialCards: CardDTO[];
  initialSubscriptions: SubscriptionDTO[];
  /** 新增/編輯/刪除訂閱後呼叫,讓外層知道要重新整理交易列表(可能有新生成的訂閱交易)。 */
  onChanged: () => void;
}) {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [showList, setShowList] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SubscriptionDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionDTO | null>(null);

  async function reload() {
    const res = await fetch("/api/subscriptions");
    const data = await res.json();
    setSubscriptions(data.subscriptions ?? []);
  }

  function openAddForm() {
    setEditing(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function handleSaved() {
    const wasAdding = !editing;
    closeForm();
    await reload();
    onChanged();
    if (wasAdding) {
      setShowList(true);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/subscriptions/${deleteTarget._id}`, { method: "DELETE" });
    setDeleteTarget(null);
    await reload();
    onChanged();
  }

  return (
    <>
      <button
        type="button"
        onClick={openAddForm}
        className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
      >
        新增訂閱
      </button>
      <button
        type="button"
        onClick={() => setShowList(true)}
        className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
      >
        查看所有訂閱
      </button>

      <Modal open={showList} onClose={() => setShowList(false)} title="所有訂閱">
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={openAddForm}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
            >
              新增訂閱
            </button>
          </div>

          {subscriptions.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              還沒有訂閱項目,新增後每個月會自動補記一筆支出,不用手動輸入。
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {subscriptions.map((sub) => (
                <li
                  key={sub._id}
                  className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">{sub.item}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      每月 {sub.startDate.slice(8, 10)} 號 · {sub.category === "cash" ? "現金" : (sub.card?.name ?? "信用卡")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">${sub.amount.toLocaleString()}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditing(sub);
                      }}
                      className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(sub)}
                      className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 dark:border-red-800 dark:text-red-400"
                    >
                      刪除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <Modal open={showForm || !!editing} onClose={closeForm} title={editing ? "編輯訂閱" : "新增訂閱"}>
        <SubscriptionForm
          key={editing ? editing._id : "new"}
          cards={initialCards}
          subscription={editing ?? undefined}
          onSaved={handleSaved}
          onCancel={closeForm}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="刪除確認"
        message={`確定要刪除「${deleteTarget?.item ?? ""}」這個訂閱嗎?已經記錄過的支出不會被刪除,只是之後不再自動生成。`}
        confirmLabel="刪除"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
