"use client";

import { useState } from "react";
import Modal from "./Modal";
import { BellIcon } from "./icons";

type NotificationDTO = {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
};

/** 給未登入也能看的首頁用:純顯示最新公告,不管已讀/未讀狀態。 */
export default function PublicNotifications({ notifications }: { notifications: NotificationDTO[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="最新公告"
        className="rounded-md border border-zinc-300 p-2 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <BellIcon className="h-5 w-5" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="最新公告">
        {notifications.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">目前沒有公告</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {notifications.map((n) => (
              <li key={n._id} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">{n.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">{n.content}</p>
                <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                  {new Date(n.createdAt).toLocaleString("zh-TW")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
