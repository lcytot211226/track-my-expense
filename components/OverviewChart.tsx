"use client";

import { useSyncExternalStore } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

export type DailyExpense = { label: string; amount: number };

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
          <Tooltip
            formatter={(value) => Number(value).toLocaleString()}
            contentStyle={{
              background: isDark ? "#1a1a19" : "#fcfcfb",
              border: `1px solid ${gridColor}`,
              borderRadius: 8,
              fontSize: 13,
            }}
            labelStyle={{ color: isDark ? "#ffffff" : "#0b0b0b" }}
          />
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
