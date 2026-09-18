"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import ConfirmDialog from "./ConfirmDialog";

type NotificationDTO = {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
};

export default function AdminNotificationClient() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<NotificationDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/notifications?limit=10");
    const data = await res.json();
    setNotifications(data.notifications ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!title.trim() || !content.trim()) {
      setError("請輸入主題與內容");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), content: content.trim() }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "發送失敗");
      return;
    }

    setTitle("");
    setContent("");
    await load();
  }

  function startEdit(n: NotificationDTO) {
    setEditingId(n._id);
    setEditTitle(n.title);
    setEditContent(n.content);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    setEditError(null);
    if (!editTitle.trim() || !editContent.trim()) {
      setEditError("請輸入主題與內容");
      return;
    }

    setEditSaving(true);
    const res = await fetch(`/api/admin/notifications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle.trim(), content: editContent.trim() }),
    });
    const data = await res.json();
    setEditSaving(false);

    if (!res.ok) {
      setEditError(data.error ?? "儲存失敗");
      return;
    }

    setEditingId(null);
    await load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/admin/notifications/${deleteTarget._id}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteTarget(null);
    await load();
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div>
          <label className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">主題</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">內容</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {submitting ? "發送中..." : "發送通知"}
        </button>
      </form>

      <div>
        <h2 className="mb-3 font-medium text-zinc-900 dark:text-zinc-50">最近的通知</h2>
        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">載入中...</p>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">還沒有發送過任何通知</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {notifications.map((n) =>
              editingId === n._id ? (
                <li key={n._id} className="rounded-md border border-zinc-300 p-3 dark:border-zinc-600">
                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={4}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                    {editError && <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(n._id)}
                        disabled={editSaving}
                        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                      >
                        {editSaving ? "儲存中..." : "儲存"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </li>
              ) : (
                <li key={n._id} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">{n.title}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
                        {n.content}
                      </p>
                      <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                        {new Date(n.createdAt).toLocaleString("zh-TW")}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(n)}
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                      >
                        編輯
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(n)}
                        className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-600 dark:border-red-800 dark:text-red-400"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                </li>
              )
            )}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="刪除通知"
        message={`確定要刪除「${deleteTarget?.title ?? ""}」這則通知嗎?`}
        confirmLabel={deleting ? "刪除中..." : "刪除"}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
