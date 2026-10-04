"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";
import Logo from "./Logo";

const NAV_LINKS = [
  { href: "/overview", label: "總覽" },
  { href: "/income", label: "收入" },
  { href: "/expense", label: "支出" },
  { href: "/cards", label: "信用卡" },
];

const HIDDEN_PATHS = ["/", "/login", "/register", "/verify-email", "/forgot-password"];

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function SettingsLink({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/settings"
      onClick={onClick}
      aria-label="設定"
      title="設定"
      className="rounded-md border border-zinc-300 p-2 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      <SettingsIcon />
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  if (HIDDEN_PATHS.includes(pathname)) {
    return null;
  }

  // 管理員入口、登出都移到 /settings,導覽列只留頁面選單 + 通知 / 設定 / 深淺色快速切換。
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
      {/* 桌面版用左右等寬(1fr)的三欄 grid,中間的選單才會真的置中,不受左右兩邊寬度不同影響 */}
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:grid sm:grid-cols-[1fr_auto_1fr]">
        <Link href="/overview" aria-label="Subanote 首頁" className="justify-self-start">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium ${
                pathname.startsWith(link.href)
                  ? "text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 justify-self-end sm:flex">
          <NotificationBell />
          <SettingsLink />
          <ThemeToggle />
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="開啟選單"
          aria-expanded={menuOpen}
          className="rounded-md border border-zinc-300 p-2 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200 sm:hidden"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-zinc-200 px-4 py-3 sm:hidden dark:border-zinc-800">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`rounded-md px-2 py-2 text-sm font-medium ${
                pathname.startsWith(link.href)
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center gap-2 px-2">
            <NotificationBell />
            <SettingsLink onClick={() => setMenuOpen(false)} />
            <ThemeToggle />
          </div>
        </nav>
      )}
    </header>
  );
}
