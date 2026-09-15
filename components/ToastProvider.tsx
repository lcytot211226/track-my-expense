"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastItem = {
  id: string;
  message: string;
};

type ToastContextValue = {
  /** 顯示一則「進行中」的提示,不會自動消失,需自行呼叫 dismiss 移除。 */
  showLoading: (message: string) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-20" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showLoading = useCallback((message: string) => {
    const id = `toast-${++idRef.current}`;
    setToasts((prev) => [...prev, { id, message }]);
    return id;
  }, []);

  const value = useMemo(() => ({ showLoading, dismiss }), [showLoading, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white/95 px-4 py-2 text-sm text-zinc-600 shadow-md shadow-black/5 dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-300"
            style={{ animation: "toast-in 180ms ease-out" }}
          >
            <SpinnerIcon />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
