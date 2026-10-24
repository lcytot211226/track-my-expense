"use client";

import { useState } from "react";
import type { CardDTO } from "./CardForm";
import type { TransactionDTO } from "./TransactionsClient";
import Modal from "./Modal";
import TransactionForm from "./TransactionForm";
import { PlusIcon } from "./icons";
import { readCachedCards } from "@/lib/cardsCache";

type TransactionType = "income" | "expense";

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "支出" },
  { value: "income", label: "收入" },
];

/**
 * 手機版 /overview 右下角的浮動「+」按鈕,點開直接用 TransactionForm 快速記一筆收入/支出,
 * 不用先跳到 /income 或 /expense。sm 以上不顯示(桌面版畫面夠寬,直接用各頁的新增按鈕)。
 *
 * 卡片清單由 /overview 傳入(總覽本來就會抓 /api/cards);總覽還沒載入完時 cards 是 null,
 * 先用 localStorage 快取(lib/cardsCache.ts)顯示表單,不用等 API,最新清單回來後自動換掉。
 */
export default function QuickAddButton({
  cards,
  onAdded,
}: {
  cards: CardDTO[] | null;
  /** 新增成功後帶入新建立的交易(分期會是整組每一期),由總覽直接併進本地列表,不重打 API。 */
  onAdded: (transactions: TransactionDTO[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("expense");
  const [cachedCards, setCachedCards] = useState<CardDTO[] | null>(null);
  const shownCards = cards ?? cachedCards;

  function handleOpen() {
    setOpen(true);
    if (!cards && !cachedCards) setCachedCards(readCachedCards());
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
        {shownCards ? (
          // 切換收入/支出時用 key 重建表單,讓付款方式等狀態回到該類型的預設值
          <TransactionForm
            key={type}
            type={type}
            cards={shownCards}
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
