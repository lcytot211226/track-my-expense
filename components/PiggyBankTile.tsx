"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import Modal from "./Modal";
import { piggyBankSaved } from "@/lib/piggyBank";
import { ChevronRightIcon, PiggyBankIcon } from "./icons";

/**
 * /overview「其他」區塊裡的存錢罐格子:點開 dialog 設定這個月想存的金額。
 * 實際存下 = max(min(存錢前結餘, 金額), 0),存下的金額會計入本月支出(由 OverviewClient 加總),
 * 所以這裡的 balance 必須是「還沒扣掉存錢罐之前」的自己結餘(不含共享項目),避免循環計算。
 */
export default function PiggyBankTile({
  period,
  amount,
  balance,
  onChange,
}: {
  period: string;
  /** 這個月想存的金額,沒設定是 null */
  amount: number | null;
  /** 還沒扣掉存錢罐之前的自己結餘(不含共享項目) */
  balance: number;
  /** 設定/刪除成功後通知外層更新本地資料,不用重新載入整個總覽 */
  onChange: (amount: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setInput(amount != null ? String(amount) : "");
    setError(null);
    setOpen(true);
  }

  async function save(next: number | null) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/piggy-bank", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period, amount: next }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setError(data?.error ?? "儲存失敗");
      return;
    }
    setOpen(false);
    onChange(next);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const value = Number(input);
    if (!input.trim() || !Number.isFinite(value) || value < 0) {
      setError("請輸入大於等於 0 的金額");
      return;
    }
    save(value);
  }

  const saved = amount != null ? piggyBankSaved(balance, amount) : 0;
  const reached = amount != null && saved >= amount;
  const preview = input.trim() && Number(input) >= 0 ? piggyBankSaved(balance, Number(input)) : null;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        title={
          amount == null
            ? "設定這個月想存多少,會從結餘裡存下並計入本月支出"
            : `想存 $${amount.toLocaleString()},依結餘實際存下 $${saved.toLocaleString()}${reached ? "(已達成)" : ""},已計入本月支出,點擊修改`
        }
        className="w-full rounded-md border border-zinc-200 p-3 text-center transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
      >
        <p className="flex items-center justify-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
          <PiggyBankIcon className="h-4 w-4" />
          存錢罐
        </p>
        {amount == null ? (
          <p className="text-lg font-semibold text-zinc-400 dark:text-zinc-500">存點錢</p>
        ) : (
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            ${saved.toLocaleString()}
            <span className="ml-1 text-xs font-normal text-zinc-500 dark:text-zinc-400">
              / ${amount.toLocaleString()}
            </span>
          </p>
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`存點錢 · ${period}`} size="sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            從本月結餘 <span className="font-medium text-zinc-900 dark:text-zinc-50">${balance.toLocaleString()}</span>{" "}
            裡存下並計入本月支出;結餘不夠就存結餘的部分,結餘是負的就是 0。
          </p>

          <label className="block">
            <span className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">這個月想存</span>
            <span className="flex items-center rounded-md border border-zinc-300 bg-white focus-within:border-zinc-500 focus-within:ring-1 focus-within:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:focus-within:border-zinc-400 dark:focus-within:ring-zinc-400">
              <span className="pl-3 text-sm text-zinc-400 dark:text-zinc-500">$</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full min-w-0 bg-transparent py-2 pl-1.5 pr-3 text-sm text-zinc-900 outline-none dark:text-zinc-50"
              />
            </span>
          </label>

          {preview != null && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              實際會存下
              <span className="ml-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                ${preview.toLocaleString()}
              </span>
              {preview < Number(input) && <span className="ml-1">(還差 ${(Number(input) - preview).toLocaleString()})</span>}
            </p>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href="/piggy-bank"
              className="flex items-center gap-0.5 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              每月概況
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
            <div className="flex gap-2">
              {amount != null && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => save(null)}
                  className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  移除
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                {saving ? "儲存中..." : "儲存"}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
