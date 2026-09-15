"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

const RESEND_COOLDOWN_SEC = 60;

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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

  async function requestCode() {
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "寄送失敗,請稍後再試");
      return;
    }

    setStep("reset");
    setCooldown(RESEND_COOLDOWN_SEC);
  }

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    await requestCode();
  }

  async function handleResetSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("兩次輸入的新密碼不一致");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, newPassword }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "重設密碼失敗");
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/login"), 1200);
  }

  async function handleResend() {
    setResendMessage(null);
    setError(null);
    setResending(true);
    const res = await fetch("/api/auth/forgot-password", {
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

        {step === "email" ? (
          <form
            onSubmit={handleEmailSubmit}
            className="w-full rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h1 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">忘記密碼</h1>
            <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
              輸入註冊時使用的 email,我們會寄送驗證碼給你
            </p>

            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-4 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />

            {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {submitting ? "寄送中..." : "寄送驗證碼"}
            </button>

            <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
              <Link href="/login" className="font-medium text-[#2a78d6] dark:text-[#3987e5]">
                返回登入
              </Link>
            </p>
          </form>
        ) : (
          <form
            onSubmit={handleResetSubmit}
            className="w-full rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h1 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">設定新密碼</h1>
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

            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">新密碼</label>
            <input
              type="password"
              required
              minLength={4}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mb-4 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />

            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">確認新密碼</label>
            <input
              type="password"
              required
              minLength={4}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mb-4 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />

            {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
            {success && (
              <p className="mb-4 text-sm text-green-600 dark:text-green-400">密碼已更新,正在前往登入頁...</p>
            )}
            {resendMessage && !error && (
              <p className="mb-4 text-sm text-green-600 dark:text-green-400">{resendMessage}</p>
            )}

            <button
              type="submit"
              disabled={submitting || code.length !== 6}
              className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {submitting ? "更新中..." : "更新密碼"}
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
        )}
      </div>
    </div>
  );
}
