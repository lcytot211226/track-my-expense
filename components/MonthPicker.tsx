"use client";

import { shiftPeriod } from "@/lib/period";

export default function MonthPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (period: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(shiftPeriod(value, -1))}
        aria-label="上一個月"
        className="rounded-md border border-zinc-300 px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        ◀
      </button>
      <input
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="選擇月份"
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
      />
      <button
        type="button"
        onClick={() => onChange(shiftPeriod(value, 1))}
        aria-label="下一個月"
        className="rounded-md border border-zinc-300 px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        ▶
      </button>
    </div>
  );
}
