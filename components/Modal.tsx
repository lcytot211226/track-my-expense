"use client";

import type { ReactNode } from "react";

export default function Modal({
  open,
  onClose,
  title,
  size = "lg",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** sm:單欄小表單(例如設定頁);lg:預設,交易表單等多欄內容 */
  size?: "sm" | "lg";
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    // 垂直置中用子元素的 my-auto 而不是外層 items-center:內容比畫面高時,items-center 會把頂端推到
    // 捲動範圍之外(切頭、捲不上去),auto margin 則會自動退回靠上對齊,整個 dialog 都捲得到。
    <div
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`my-4 h-fit w-full ${size === "sm" ? "max-w-md" : "max-w-2xl"} rounded-lg bg-white shadow-xl sm:my-auto dark:bg-zinc-900`}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="關閉"
              className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              ✕
            </button>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
