"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

const RESEND_COOLDOWN_SEC = 60;

export default function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("emailError") ? "帳號已建立,但驗證信寄送失敗,請按下方「重新寄送驗證碼」再試一次" : null
  );
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();

    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "驗證失敗");
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/login"), 1200);
  }

  async function handleResend() {
    setResendMessage(null);
    setError(null);
    setResending(true);

    const res = await fetch("/api/auth/resend-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    setResending(false);
    if (!res.ok) {
      setError(data.error ?? "重新寄送失敗");
      return;
    }

    setResendMessage("已重新寄送驗證碼,請查看信箱");
    setCooldown(RESEND_COOLDOWN_SEC);
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
          <h1 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">輸入驗證碼</h1>
          <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
            已寄送 6 位數驗證碼到 <span className="font-medium text-zinc-700 dark:text-zinc-300">{email}</span>,
            10 分鐘內有效
          </p>

          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">驗證碼</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="mb-4 w-full rounded-md border border-zinc-300 px-3 py-2 text-center text-lg tracking-[0.5em] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />

          {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
          {success && (
            <p className="mb-4 text-sm text-green-600 dark:text-green-400">帳號已啟用,正在前往登入頁...</p>
          )}
          {resendMessage && !error && (
            <p className="mb-4 text-sm text-green-600 dark:text-green-400">{resendMessage}</p>
          )}

          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {submitting ? "驗證中..." : "驗證"}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="mt-3 w-full rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {cooldown > 0 ? `重新寄送驗證碼(${cooldown}s)` : resending ? "寄送中..." : "重新寄送驗證碼"}
          </button>

          <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            <Link href="/login" className="font-medium text-[#2a78d6] dark:text-[#3987e5]">
              返回登入
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
