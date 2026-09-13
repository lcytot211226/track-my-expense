"use client";

import { useSyncExternalStore } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

const EXPENSE_COLOR = { light: "#2a78d6", dark: "#3987e5" };

function subscribeToThemeChange(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getIsDarkSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function useIsDark() {
  return useSyncExternalStore(subscribeToThemeChange, getIsDarkSnapshot, () => false);
}

export type DailyExpenseItem = { item: string; amount: number };
export type DailyExpense = { label: string; amount: number; items: DailyExpenseItem[] };

function DailyTooltip({
  active,
  payload,
  label,
  isDark,
  gridColor,
}: TooltipContentProps<ValueType, NameType> & { isDark: boolean; gridColor: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload as DailyExpense;

  return (
    <div
      className="rounded-lg px-3 py-2 text-sm"
      style={{ background: isDark ? "#1a1a19" : "#fcfcfb", border: `1px solid ${gridColor}` }}
    >
      <p className={`font-medium ${isDark ? "text-zinc-50" : "text-zinc-900"}`}>
        {label} · 共 ${data.amount.toLocaleString()}
      </p>
      {data.items.length === 0 ? (
        <p className={`mt-1 text-xs ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>當天無支出</p>
      ) : (
        <ul className="mt-1 flex flex-col gap-0.5">
          {data.items.map((it, idx) => (
            <li
              key={idx}
              className={`flex items-center justify-between gap-4 text-xs ${isDark ? "text-zinc-300" : "text-zinc-600"}`}
            >
              <span className="truncate">{it.item}</span>
              <span className="shrink-0">${it.amount.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function OverviewChart({ dailyExpense }: { dailyExpense: DailyExpense[] }) {
  const isDark = useIsDark();
  const color = isDark ? EXPENSE_COLOR.dark : EXPENSE_COLOR.light;
  const gridColor = isDark ? "#2c2c2a" : "#e1e0d9";
  const tickColor = "#898781";

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dailyExpense} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="1 0" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: tickColor, fontSize: 12 }}
            axisLine={{ stroke: gridColor }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: tickColor, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => value.toLocaleString()}
          />
          <Tooltip content={(props) => <DailyTooltip {...props} isDark={isDark} gridColor={gridColor} />} />
          <Area
            type="monotone"
            dataKey="amount"
            name="支出"
            stroke={color}
            fill={color}
            fillOpacity={0.1}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
