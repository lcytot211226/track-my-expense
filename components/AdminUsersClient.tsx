"use client";

import { useEffect, useState, type FormEvent } from "react";

type AdminUserDTO = { _id: string; email: string; createDate: string; emailVerified: boolean };
type UsersResponse = { users: AdminUserDTO[]; total: number; page: number; pageSize: number };

/** 後台使用者清單:伺服器端分頁(每頁 20 筆,新到舊),可依 email 搜尋。 */
export default function AdminUsersClient() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [input, setInput] = useState("");
  const [data, setData] = useState<UsersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page) });
    if (query) params.set("q", query);
    fetch(`/api/admin/users?${params}`)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? "載入失敗");
          return;
        }
        setError(null);
        setData(json);
      })
      .catch(() => {
        if (!cancelled) setError("載入失敗");
      });
    return () => {
      cancelled = true;
    };
  }, [page, query]);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setQuery(input.trim());
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium text-zinc-900 dark:text-zinc-50">
          所有使用者{data && <span className="ml-1 text-sm font-normal text-zinc-500">({data.total.toLocaleString()})</span>}
        </p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="搜尋 email"
            className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm sm:w-56 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
          <button
            type="submit"
            className="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            搜尋
          </button>
        </form>
      </div>

      {error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
      ) : !data ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">載入中...</p>
      ) : data.users.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">沒有符合的使用者</p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {data.users.map((user) => (
            <li key={user._id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate text-zinc-900 dark:text-zinc-50">{user.email}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(user.createDate).toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false })}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                  user.emailVerified
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {user.emailVerified ? "已驗證" : "未驗證"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {data && data.total > data.pageSize && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
            className="rounded-md border border-zinc-300 px-3 py-1 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200"
          >
            上一頁
          </button>
          <span className="text-zinc-500 dark:text-zinc-400">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            className="rounded-md border border-zinc-300 px-3 py-1 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200"
          >
            下一頁
          </button>
        </div>
      )}
    </div>
  );
}
