"use client";

import { useState } from "react";
import type { CardDTO } from "./CardForm";
import Modal from "./Modal";
import TransactionForm from "./TransactionForm";
import { PlusIcon } from "./icons";

type TransactionType = "income" | "expense";

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "支出" },
  { value: "income", label: "收入" },
];

/**
 * 手機版 /overview 右下角的浮動「+」按鈕,點開直接用 TransactionForm 快速記一筆收入/支出,
 * 不用先跳到 /income 或 /expense。sm 以上不顯示(桌面版畫面夠寬,直接用各頁的新增按鈕)。
 */
export default function QuickAddButton({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("expense");
  // 卡片清單只在第一次打開時抓,之後沿用
  const [cards, setCards] = useState<CardDTO[] | null>(null);

  async function handleOpen() {
    setOpen(true);
    if (cards) return;
    const res = await fetch("/api/cards");
    const data = res.ok ? await res.json() : {};
    setCards(data.cards ?? []);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="快速記帳"
        title="快速記帳"
        className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-transform active:scale-90 motion-reduce:transition-none sm:hidden dark:bg-zinc-100 dark:text-zinc-900"
      >
        <PlusIcon className="h-7 w-7" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="快速記帳">
        <div
          role="group"
          aria-label="收入或支出"
          className="mb-4 grid grid-cols-2 gap-1 rounded-md border border-zinc-300 p-0.5 text-sm dark:border-zinc-700"
        >
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              aria-pressed={type === opt.value}
              className={`rounded px-3 py-1.5 font-medium ${
                type === opt.value
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 dark:text-zinc-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {cards ? (
          // 切換收入/支出時用 key 重建表單,讓付款方式等狀態回到該類型的預設值
          <TransactionForm
            key={type}
            type={type}
            cards={cards}
            onSaved={() => setOpen(false)}
            onAdded={onAdded}
            onCancel={() => setOpen(false)}
          />
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">載入中...</p>
        )}
      </Modal>
    </>
  );
}
