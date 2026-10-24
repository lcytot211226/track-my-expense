"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDaysIcon } from "./icons";

export type MonthRange = { start: number; end: number };

export const FULL_YEAR: MonthRange = { start: 1, end: 12 };

/**
 * 年度檢視的月份區間選擇:按鈕顯示目前區間,點開是 12 個月的格子。
 * 第一下選起始月、第二下選結束月(點到比起始月早的會自動對調),選完就關閉;「全年」一鍵回到 1–12 月。
 */
export default function MonthRangePicker({
  value,
  onChange,
}: {
  value: MonthRange;
  onChange: (range: MonthRange) => void;
}) {
  const [open, setOpen] = useState(false);
  // 已點了起始月、等待選結束月;null 代表還沒開始選
  const [pendingStart, setPendingStart] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setPendingStart(null);
    setHovered(null);
  }

  function pick(month: number) {
    if (pendingStart === null) {
      setPendingStart(month);
      return;
    }
    onChange({ start: Math.min(pendingStart, month), end: Math.max(pendingStart, month) });
    close();
  }

  // 選結束月時,滑鼠移到哪就先預覽到哪
  const preview: MonthRange =
    pendingStart === null
      ? value
      : {
          start: Math.min(pendingStart, hovered ?? pendingStart),
          end: Math.max(pendingStart, hovered ?? pendingStart),
        };
  const isFullYear = value.start === 1 && value.end === 12;
  const label = isFullYear ? "1 月 – 12 月" : value.start === value.end ? `${value.start} 月` : `${value.start} 月 – ${value.end} 月`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`統計月份:${label}`}
        className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors ${
          isFullYear
            ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
            : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        }`}
      >
        <CalendarDaysIcon className="h-4 w-4" />
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="選擇統計月份"
          className="absolute left-0 top-full z-30 mt-2 w-64 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
            {pendingStart === null ? "點選起始月份" : `從 ${pendingStart} 月起,再點選結束月份`}
          </p>
          <div className="grid grid-cols-4 gap-1" onPointerLeave={() => setHovered(null)}>
            {Array.from({ length: 12 }, (_, i) => {
              const month = i + 1;
              const inRange = month >= preview.start && month <= preview.end;
              const isEdge = month === preview.start || month === preview.end;
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => pick(month)}
                  onPointerEnter={() => setHovered(month)}
                  aria-pressed={inRange}
                  className={`rounded-md py-2 text-sm transition-colors ${
                    isEdge
                      ? "bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : inRange
                        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                        : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  {month}月
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex justify-end border-t border-zinc-200 pt-2 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                onChange(FULL_YEAR);
                close();
              }}
              className="rounded-md px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              全年
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
