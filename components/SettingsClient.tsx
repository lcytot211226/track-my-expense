"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "./Modal";
import SpecialDateForm from "./SpecialDateForm";
import ChangePasswordForm from "./ChangePasswordForm";
import AddToHomeScreenGuide from "./AddToHomeScreenGuide";
import DeleteAccountForm from "./DeleteAccountForm";
import ThemeSettings, { THEME_OPTIONS, useThemePreference } from "./ThemeSettings";
import {
  ArrowRightStartOnRectangleIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  DevicePhoneMobileIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  SunIcon,
  TrashIcon,
  UserCircleIcon,
} from "./icons";

type DialogKey = "specialDate" | "password" | "theme" | "homeScreen" | "deleteAccount";

const DIALOGS: Record<DialogKey, { title: string; content: ReactNode }> = {
  specialDate: { title: "月結算日", content: <SpecialDateForm /> },
  password: { title: "修改密碼", content: <ChangePasswordForm /> },
  theme: { title: "外觀", content: <ThemeSettings /> },
  homeScreen: { title: "加到手機主畫面", content: <AddToHomeScreenGuide /> },
  deleteAccount: { title: "刪除帳號", content: <DeleteAccountForm /> },
};

const ROW_CLASS =
  "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-800/60 dark:active:bg-zinc-800";

/** 一列設定的內容(圖示 + 標題 + 說明 + 右側箭頭),外層是 button 或 Link 由呼叫端決定。 */
function RowContent({
  Icon,
  title,
  description,
  danger,
  chevron = true,
}: {
  Icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  danger?: boolean;
  chevron?: boolean;
}) {
  return (
    <>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          danger
            ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block font-medium ${danger ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-50"}`}
        >
          {title}
        </span>
        {description && (
          <span className="block truncate text-sm text-zinc-500 dark:text-zinc-400">{description}</span>
        )}
      </span>
      {chevron && <ChevronRightIcon className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500" />}
    </>
  );
}

function Group({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {children}
    </ul>
  );
}

/** 設定頁:每個設定項目是一列,點開後在 dialog 裡顯示對應的表單 / 說明;管理員後台、登出也在這裡。 */
export default function SettingsClient() {
  const router = useRouter();
  const [openKey, setOpenKey] = useState<DialogKey | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const themePreference = useThemePreference();
  const themeLabel = THEME_OPTIONS.find((o) => o.value === themePreference)?.label;

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setIsAdmin(!!data.isAdmin);
        setEmail(data.email ?? null);
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function dialogRow(key: DialogKey, Icon: ComponentType<{ className?: string }>, description: string, danger?: boolean) {
    return (
      <li key={key}>
        <button type="button" onClick={() => setOpenKey(key)} className={ROW_CLASS}>
          <RowContent Icon={Icon} title={DIALOGS[key].title} description={description} danger={danger} />
        </button>
      </li>
    );
  }

  const openDialog = openKey ? DIALOGS[openKey] : null;

  return (
    <div className="flex flex-col gap-6">
      <Group>
        <li className="flex items-center gap-3 px-4 py-3.5">
          <RowContent Icon={UserCircleIcon} title="目前登入帳號" description={email ?? "載入中..."} chevron={false} />
        </li>
      </Group>

      <Group>
        {dialogRow("specialDate", CalendarDaysIcon, "總覽頁依此算出每日可花預算")}
        {dialogRow("theme", SunIcon, `目前:${themeLabel}`)}
        {dialogRow("homeScreen", DevicePhoneMobileIcon, "像 App 一樣從桌面圖示打開")}
      </Group>

      {isAdmin && (
        <Group>
          <li>
            <Link href="/admin" className={ROW_CLASS}>
              <RowContent Icon={ShieldCheckIcon} title="管理員後台" description="發布 / 編輯系統公告" />
            </Link>
          </li>
        </Group>
      )}

      <Group>
        {dialogRow("password", LockClosedIcon, "更新登入密碼")}
        <li>
          <button type="button" onClick={handleLogout} disabled={loggingOut} className={`${ROW_CLASS} disabled:opacity-50`}>
            <RowContent
              Icon={ArrowRightStartOnRectangleIcon}
              title={loggingOut ? "登出中..." : "登出"}
              chevron={false}
            />
          </button>
        </li>
        {dialogRow("deleteAccount", TrashIcon, "永久刪除帳號與所有資料", true)}
      </Group>

      <Modal open={!!openDialog} onClose={() => setOpenKey(null)} title={openDialog?.title} size="sm">
        {openDialog?.content}
      </Modal>
    </div>
  );
}
