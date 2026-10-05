"use client";

import { useState, type FormEvent } from "react";
import type { CardDTO } from "./CardForm";
import { FIXED_OVERVIEW_ITEM_KEYS, FIXED_ITEM_LABELS, cardItemKey } from "@/lib/overviewItems";

/** 編輯既有分享對象時傳入:email 鎖定不能改,existingItems 是目前已分享給對方的項目(預先勾選)。 */
export type ShareFormEditTarget = {
  targetEmail: string;
  existingItems: { itemKey: string; label: string }[];
};

export default function ShareForm({
  cards,
  editTarget,
  onSaved,
  onCancel,
}: {
  cards: CardDTO[];
  editTarget?: ShareFormEditTarget;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!editTarget;
  const [targetEmail, setTargetEmail] = useState(editTarget?.targetEmail ?? "");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(editTarget?.existingItems.map((i) => i.itemKey) ?? [])
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const optionKeys = new Set<string>([...FIXED_OVERVIEW_ITEM_KEYS, ...cards.map((c) => cardItemKey(c._id))]);
  const orphanItems = editTarget?.existingItems.filter((i) => !optionKeys.has(i.itemKey)) ?? [];

  function toggleKey(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!targetEmail.trim()) {
      setError("請輸入對方的 email");
      return;
    }
    // 編輯模式全部取消勾選 = 取消分享給這個人的所有項目,允許送出。
    if (!isEdit && selectedKeys.size === 0) {
      setError("請至少選擇一個要分享的項目");
      return;
    }

    setSubmitting(true);
    // 新增:POST 只會加上勾選的項目;編輯:PUT 把這個 email 的分享項目整份設成目前的勾選。
    const res = await fetch("/api/shares", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetEmail: targetEmail.trim(), itemKeys: Array.from(selectedKeys) }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? (isEdit ? "儲存失敗" : "分享失敗"));
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">分享給(email)</label>
        <input
          required
          type="email"
          value={targetEmail}
          onChange={(e) => setTargetEmail(e.target.value)}
          readOnly={isEdit}
          placeholder="example@mail.com"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm read-only:bg-zinc-100 read-only:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:read-only:bg-zinc-800/60 dark:read-only:text-zinc-400"
        />
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          {isEdit
            ? "勾選要分享的項目,取消勾選的項目會停止分享;全部取消等於不再分享給這個人。"
            : "不需要是已註冊的帳號,對方之後用這個 email 登入就看得到。"}
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">要分享的項目</label>
        <div className="flex flex-col gap-1.5">
          {FIXED_OVERVIEW_ITEM_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input type="checkbox" checked={selectedKeys.has(key)} onChange={() => toggleKey(key)} />
              {FIXED_ITEM_LABELS[key]}
            </label>
          ))}
          {cards.map((card) => {
            const key = cardItemKey(card._id);
            return (
              <label key={key} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input type="checkbox" checked={selectedKeys.has(key)} onChange={() => toggleKey(key)} />
                {card.name}
              </label>
            );
          })}
          {/* 已分享但卡片已被刪除的項目不在上面的選項裡,另外列出來讓使用者可以取消 */}
          {orphanItems.map((item) => (
            <label key={item.itemKey} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input type="checkbox" checked={selectedKeys.has(item.itemKey)} onChange={() => toggleKey(item.itemKey)} />
              {item.label}
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {isEdit ? "儲存" : "分享"}
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
