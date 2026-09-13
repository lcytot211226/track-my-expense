"use client";

import { useEffect, useState, type FormEvent } from "react";

export default function SpecialDateForm() {
  const [specialDate, setSpecialDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.specialDate === "number") setSpecialDate(String(data.specialDate));
        setLoading(false);
      });
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    const value = specialDate === "" ? null : Number(specialDate);
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ specialDate: value }),
    });
    const data = await res.json();

    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "更新失敗");
      return;
    }
    setSuccess(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-sm flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        設定每個月的月結算日,總覽頁會依此算出「到這天前平均每天還能花多少錢」(當月結餘 ÷ 剩餘天數)。
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">月結算日(1-31 號)</label>
        <input
          type="number"
          min={1}
          max={31}
          disabled={loading}
          value={specialDate}
          onChange={(e) => setSpecialDate(e.target.value)}
          placeholder="例如 20"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {success && <p className="text-sm text-green-600 dark:text-green-400">已更新</p>}

      <button
        type="submit"
        disabled={submitting || loading}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {submitting ? "更新中..." : "更新"}
      </button>
    </form>
  );
}
