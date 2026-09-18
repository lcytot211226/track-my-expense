"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import { BellIcon } from "./icons";

type NotificationDTO = {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unread, setUnread] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setUnread(!!data.unread);
      })
      .catch(() => {});
  }, []);

  // 打開通知才算已讀,樂觀地先把紅點關掉,不用等 API 回應。
  function handleOpen() {
    setOpen(true);
    if (unread) {
      setUnread(false);
      fetch("/api/notifications/mark-read", { method: "POST" }).catch(() => {});
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="通知"
        className="relative rounded-md border border-zinc-300 p-2 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <BellIcon className="h-5 w-5" />
        {unread && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="系統通知">
        {notifications.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">目前沒有通知</p>
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
