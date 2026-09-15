"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import ConfirmDialog from "./ConfirmDialog";

export default function DeleteAccountForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    setConfirmOpen(false);
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/delete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setSubmitting(false);
      setError(data.error ?? "刪除失敗");
      return;
    }

    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="flex max-w-sm flex-col gap-4 rounded-lg border border-red-200 bg-white p-4 dark:border-red-900/50 dark:bg-zinc-900"
      >
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          刪除帳號後,你的信用卡、收支紀錄、房租電費、自訂項目等所有資料都會被永久刪除,無法復原。
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            輸入密碼以確認
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {submitting ? "刪除中..." : "刪除帳號"}
        </button>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title="刪除帳號"
        message="此操作無法復原,確定要永久刪除你的帳號與所有資料嗎?"
        confirmLabel="永久刪除"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
