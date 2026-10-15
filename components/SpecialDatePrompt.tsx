"use client";

import { useState, type FormEvent } from "react";
import { CalendarDaysIcon } from "./icons";

// 使用者按叉叉關掉提示後記在 localStorage,之後不再顯示(只影響這台裝置 / 瀏覽器)
const DISMISSED_KEY = "special-date-prompt-dismissed";

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * 總覽頁在使用者還沒設定月結算日(specialDate)時顯示的提示,
 * 讓使用者知道有「每日可花預算」這個功能,並可以直接在這裡設定,不用跑去 /settings。
 */
export default function SpecialDatePrompt({ onSaved }: { onSaved: (specialDate: number) => void }) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 總覽頁要等 /api/auth/me 回來才會渲染這個元件,不會出現在 SSR,可以直接讀 localStorage
  const [dismissed, setDismissed] = useState(readDismissed);

  function handleDismiss() {
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // localStorage 不可用時只關掉這次
    }
    setDismissed(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const day = Number(value);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      setError("請輸入 1-31 的日期");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ specialDate: day }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "設定失敗");
      return;
    }
    onSaved(day);
  }

  if (dismissed) return null;

  return (
    <form
      onSubmit={handleSubmit}
      className="relative mb-4 flex flex-col gap-3 rounded-lg border border-dashed border-zinc-300 p-3 pr-9 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-700"
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="不再顯示"
        title="不再顯示"
        className="absolute top-1.5 right-1.5 rounded-md p-1 text-xs leading-none text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      >
        ✕
      </button>
      <div className="flex items-start gap-2 text-sm">
        <CalendarDaysIcon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
        <div>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">設定月結算日,看看每天還能花多少</p>
          <p className="text-zinc-500 dark:text-zinc-400">
            例如發薪日;會依「本月結餘 ÷ 距結算日天數」算出每日可花預算,之後可在設定頁修改。
          </p>
          {error && <p className="mt-1 text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">每月</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={31}
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="1-31"
          className="w-20 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
        <span className="text-sm text-zinc-500 dark:text-zinc-400">號</span>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {submitting ? "設定中..." : "設定"}
        </button>
      </div>
    </form>
  );
}
