"use client";

import { useState, type FormEvent } from "react";
import { calculateElecCost } from "@/lib/calculateElecCost";

export type UtilityDTO = {
  date: number;
  rent: number;
  elec: {
    start: number;
    end: number;
    unitPrice: number;
    manualAmount: number | null;
  };
};

const emptyUtility: UtilityDTO = {
  date: 1,
  rent: 0,
  elec: { start: 0, end: 0, unitPrice: 0, manualAmount: null },
};

export default function UtilityInlineEditor({
  year,
  month,
  utility,
  loading,
  onSaved,
}: {
  year: number;
  month: number;
  utility: UtilityDTO | null;
  loading: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UtilityDTO>(utility ?? emptyUtility);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setForm(utility ?? emptyUtility);
    setError(null);
    setEditing(true);
  }

  const isManual = form.elec.manualAmount !== null;

  function setManualMode(manual: boolean) {
    setForm({
      ...form,
      elec: { ...form.elec, manualAmount: manual ? (form.elec.manualAmount ?? 0) : null },
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/utilities", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month, ...form }),
    });
    const data = await res.json();

    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "儲存失敗");
      return;
    }

    setEditing(false);
    onSaved();
  }

  if (!editing) {
    // 還不知道這個月到底有沒有資料時,顯示骨架畫面,不要用 emptyUtility 的 0 冒充「沒有資料」,
    // 避免使用者看到「一下有資料、一下沒資料」的閃爍。
    if (loading && !utility) {
      return (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-50">房租電費</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <div className="mb-2 h-3 w-12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    const display = utility ?? emptyUtility;
    const displayIsManual = display.elec.manualAmount !== null;
    const elecCost = calculateElecCost(display.elec);

    return (
      <div
        className={`rounded-lg border border-zinc-200 bg-white p-4 transition-opacity dark:border-zinc-800 dark:bg-zinc-900 ${loading ? "opacity-60" : ""}`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-zinc-900 dark:text-zinc-50">房租電費</h2>
          <button
            type="button"
            onClick={startEdit}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
          >
            編輯
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">帳單日</p>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">{display.date} 號</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">租金</p>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">${display.rent.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {displayIsManual ? "電表" : "電表(起/迄)"}
            </p>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">
              {displayIsManual ? "手動輸入電費" : `${display.elec.start} / ${display.elec.end}`}
            </p>
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">電費</p>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">${elecCost.toLocaleString()}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 className="mb-3 font-medium text-zinc-900 dark:text-zinc-50">房租電費</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">帳單日</label>
          <input
            type="number"
            min={1}
            max={31}
            value={form.date}
            onChange={(e) => setForm({ ...form, date: Number(e.target.value) })}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">租金</label>
          <input
            type="number"
            min={0}
            value={form.rent}
            onChange={(e) => setForm({ ...form, rent: Number(e.target.value) })}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm text-zinc-500 dark:text-zinc-400">電費計算方式</label>
          <div className="flex gap-1 rounded-md border border-zinc-300 p-0.5 text-sm dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setManualMode(false)}
              className={`rounded px-2 py-1 ${
                !isManual
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 dark:text-zinc-300"
              }`}
            >
              依電表計算
            </button>
            <button
              type="button"
              onClick={() => setManualMode(true)}
              className={`rounded px-2 py-1 ${
                isManual
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 dark:text-zinc-300"
              }`}
            >
              直接輸入金額
            </button>
          </div>
        </div>

        {!isManual ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">電表起始</label>
              <input
                type="number"
                min={0}
                value={form.elec.start}
                onChange={(e) => setForm({ ...form, elec: { ...form.elec, start: Number(e.target.value) } })}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">電表結束</label>
              <input
                type="number"
                min={0}
                value={form.elec.end}
                onChange={(e) => setForm({ ...form, elec: { ...form.elec, end: Number(e.target.value) } })}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">每度電價</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.elec.unitPrice}
                onChange={(e) => setForm({ ...form, elec: { ...form.elec, unitPrice: Number(e.target.value) } })}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
            <p className="col-span-2 text-sm text-zinc-500 sm:col-span-3 dark:text-zinc-400">
              預估電費:${calculateElecCost(form.elec).toLocaleString()}
            </p>
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">電費金額</label>
            <input
              type="number"
              min={0}
              value={form.elec.manualAmount ?? 0}
              onChange={(e) => setForm({ ...form, elec: { ...form.elec, manualAmount: Number(e.target.value) } })}
              className="w-full max-w-xs rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {saving ? "儲存中..." : "儲存"}
        </button>
        <button
          type="button"
          onClick={() => {
            setForm(utility ?? emptyUtility);
            setEditing(false);
          }}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
        >
          取消
        </button>
      </div>
    </form>
  );
}
