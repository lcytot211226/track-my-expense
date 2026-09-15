"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    setLoading(false);
    if (!res.ok) {
      if (data.needsVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(data.email ?? email)}`);
        return;
      }
      setError(data.error ?? "登入失敗");
      return;
    }

    router.push("/overview");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in srgb, #2a78d6 12%, transparent), transparent)",
        }}
      />

      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-6 block text-center text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          記帳本
        </Link>

        <form
          onSubmit={handleSubmit}
          className="w-full rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">登入</h1>

          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />

          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">密碼</label>
            <Link href="/forgot-password" className="text-xs font-medium text-[#2a78d6] dark:text-[#3987e5]">
              忘記密碼?
            </Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />

          {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {loading ? "登入中..." : "登入"}
          </button>

          <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            還沒有帳號?{" "}
            <Link href="/register" className="font-medium text-[#2a78d6] dark:text-[#3987e5]">
              註冊
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
