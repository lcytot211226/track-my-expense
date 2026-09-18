"use client";

import { useState, type FormEvent } from "react";
import { calculateMeterCost, type MeterInfo } from "@/lib/calculateMeterCost";

export type UtilityDTO = {
  date: number;
  rent: number;
  elec: MeterInfo;
  water: MeterInfo;
  rentEnabled: boolean;
  elecEnabled: boolean;
  waterEnabled: boolean;
  // 總開關,獨立於上面三個個別開關之外,只影響顯示/統計要不要把這個月算進去。
  enabled: boolean;
};

type MeterField = "elec" | "water";

const emptyMeter: MeterInfo = { start: 0, end: 0, unitPrice: 0, manualAmount: null };

const emptyUtility: UtilityDTO = {
  date: 1,
  rent: 0,
  elec: { ...emptyMeter },
  water: { ...emptyMeter },
  rentEnabled: true,
  elecEnabled: true,
  waterEnabled: true,
  enabled: true,
};

const METER_LABEL: Record<MeterField, { name: string; unit: string; short: string }> = {
  elec: { name: "電費", unit: "每度電價", short: "電表" },
  water: { name: "水費", unit: "每度水價", short: "水表" },
};

function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <label className={`flex items-center gap-2 text-sm ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      {label && <span className="text-zinc-600 dark:text-zinc-300">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:cursor-not-allowed ${
          checked ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}

function MeterEditor({
  field,
  meter,
  enabled,
  onChange,
  onToggleEnabled,
}: {
  field: MeterField;
  meter: MeterInfo;
  enabled: boolean;
  onChange: (next: MeterInfo) => void;
  onToggleEnabled: (next: boolean) => void;
}) {
  const label = METER_LABEL[field];
  const isManual = meter.manualAmount !== null;

  function setManualMode(manual: boolean) {
    onChange({ ...meter, manualAmount: manual ? (meter.manualAmount ?? 0) : null });
  }

  return (
    <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <label className="text-sm text-zinc-500 dark:text-zinc-400">{label.name}計算方式</label>
          <Switch checked={enabled} onChange={onToggleEnabled} label="計入統計" />
        </div>
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
            依{label.short}計算
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
            <label className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">{label.short}起始</label>
            <input
              type="number"
              min={0}
              value={meter.start}
              onChange={(e) => onChange({ ...meter, start: Number(e.target.value) })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">{label.short}結束</label>
            <input
              type="number"
              min={0}
              value={meter.end}
              onChange={(e) => onChange({ ...meter, end: Number(e.target.value) })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">{label.unit}</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={meter.unitPrice}
              onChange={(e) => onChange({ ...meter, unitPrice: Number(e.target.value) })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>
          <p className="col-span-2 text-sm text-zinc-500 sm:col-span-3 dark:text-zinc-400">
            預估{label.name}:${calculateMeterCost(meter).toLocaleString()}
          </p>
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">{label.name}金額</label>
          <input
            type="number"
            min={0}
            value={meter.manualAmount ?? 0}
            onChange={(e) => onChange({ ...meter, manualAmount: Number(e.target.value) })}
            className="w-full max-w-xs rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>
      )}
    </div>
  );
}

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
  const [togglingAll, setTogglingAll] = useState(false);

  function startEdit() {
    setForm(utility ?? emptyUtility);
    setError(null);
    setEditing(true);
  }

  // 編輯旁的總開關:只決定這個月的房租水電要不要顯示/計入統計,不會動到租金/電費/水費各自的開關,
  // 資料原封不動送出去,重新打開後租金/電費/水費原本的狀態都還在。若只想關掉其中一項,要點「編輯」進去個別設定。
  async function toggleMasterEnabled() {
    const display = utility ?? emptyUtility;
    const next = !display.enabled;
    setTogglingAll(true);
    await fetch("/api/utilities", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year,
        month,
        date: display.date,
        rent: display.rent,
        elec: display.elec,
        water: display.water,
        rentEnabled: display.rentEnabled,
        elecEnabled: display.elecEnabled,
        waterEnabled: display.waterEnabled,
        enabled: next,
      }),
    });
    setTogglingAll(false);
    onSaved();
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
            <h2 className="font-medium text-zinc-900 dark:text-zinc-50">房租水電費</h2>
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
    const elecCostRaw = calculateMeterCost(display.elec);
    const waterCostRaw = calculateMeterCost(display.water);
    const subtotal =
      (display.rentEnabled ? display.rent : 0) +
      (display.elecEnabled ? elecCostRaw : 0) +
      (display.waterEnabled ? waterCostRaw : 0);
    // 總開關關掉時,顯示上直接擋成 0、整塊變暗,但租金/電費/水費原本的數字跟各自開關狀態都還在,不會被清空。
    const totalCost = display.enabled ? subtotal : 0;

    return (
      <div
        className={`rounded-lg border border-zinc-200 bg-white p-4 transition-opacity dark:border-zinc-800 dark:bg-zinc-900 ${loading ? "opacity-60" : ""}`}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-50">房租水電費</h2>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              總共 ${totalCost.toLocaleString()} <span className="font-semibold text-zinc-900 dark:text-zinc-50"></span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div title="總開關:是否把這個月的房租水電計入上方支出/結餘統計;不會動到租金/電費/水費各自的開關。若要個別關閉租金/電費/水費,請點「編輯」">
              <Switch
                checked={display.enabled}
                onChange={toggleMasterEnabled}
                disabled={togglingAll}
                label={display.enabled ? "已計入統計" : "未計入統計"}
              />
            </div>
            <button
              type="button"
              onClick={startEdit}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
            >
              編輯
            </button>
          </div>
        </div>
        <div
          className={`grid grid-cols-2 gap-3 sm:grid-cols-4 transition-opacity ${!display.enabled ? "opacity-40" : ""}`}
        >
          <div className="rounded-md border border-zinc-200 p-3 text-center dark:border-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">帳單日</p>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">{display.date} 號</p>
          </div>
          <div
            className={`rounded-md border border-zinc-200 p-3 text-center transition-opacity dark:border-zinc-800 ${!display.rentEnabled ? "opacity-40" : ""}`}
          >
            <p className="text-sm text-zinc-500 dark:text-zinc-400">租金</p>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">${display.rent.toLocaleString()}</p>
          </div>
          <div
            className={`rounded-md border border-zinc-200 p-3 text-center transition-opacity dark:border-zinc-800 ${!display.elecEnabled ? "opacity-40" : ""}`}
          >
            <p className="text-sm text-zinc-500 dark:text-zinc-400">電費</p>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">${elecCostRaw.toLocaleString()}</p>
          </div>
          <div
            className={`rounded-md border border-zinc-200 p-3 text-center transition-opacity dark:border-zinc-800 ${!display.waterEnabled ? "opacity-40" : ""}`}
          >
            <p className="text-sm text-zinc-500 dark:text-zinc-400">水費</p>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">${waterCostRaw.toLocaleString()}</p>
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
      <h2 className="mb-3 font-medium text-zinc-900 dark:text-zinc-50">房租水電費</h2>
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
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm text-zinc-500 dark:text-zinc-400">租金</label>
            <Switch
              checked={form.rentEnabled}
              onChange={(next) => setForm({ ...form, rentEnabled: next })}
              label="計入統計"
            />
          </div>
          <input
            type="number"
            min={0}
            value={form.rent}
            onChange={(e) => setForm({ ...form, rent: Number(e.target.value) })}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>
      </div>

      <MeterEditor
        field="elec"
        meter={form.elec}
        enabled={form.elecEnabled}
        onChange={(next) => setForm({ ...form, elec: next })}
        onToggleEnabled={(next) => setForm({ ...form, elecEnabled: next })}
      />
      <MeterEditor
        field="water"
        meter={form.water}
        enabled={form.waterEnabled}
        onChange={(next) => setForm({ ...form, water: next })}
        onToggleEnabled={(next) => setForm({ ...form, waterEnabled: next })}
      />

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
