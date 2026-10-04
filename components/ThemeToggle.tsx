"use client";

import { setThemePreference } from "@/lib/theme";

// 導覽列的快速切換:直接切成跟目前相反的淺色/深色(會離開「跟隨系統」),三段式設定在 /settings。
function toggle() {
  setThemePreference(document.documentElement.classList.contains("dark") ? "light" : "dark");
}

export default function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="切換深色/淺色模式"
      className="rounded-md border border-zinc-300 p-2 text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      {/* 太陽:實心圓 + 8 道等距光芒(中心 12,12,光芒從半徑 7 畫到 9),淺色模式顯示 */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        className="h-5 w-5 dark:hidden"
      >
        <circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.64 5.64l1.41 1.41M16.95 16.95l1.41 1.41M5.64 18.36l1.41-1.41M16.95 7.05l1.41-1.41" />
      </svg>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="hidden h-5 w-5 dark:block"
      >
        <path d="M20.354 15.354A9 9 0 0 1 8.646 3.646 9.003 9.003 0 1 0 20.354 15.354Z" />
      </svg>
    </button>
  );
}
