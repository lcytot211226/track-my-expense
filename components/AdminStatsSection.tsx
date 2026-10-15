"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { DailyCount, WindowStats } from "@/lib/getAdminStats";
import { useIsDark } from "@/lib/useIsDark";

const BAR_COLOR = { light: "#2a78d6", dark: "#3987e5" };

function CountTooltip({
  active,
  payload,
  isDark,
  gridColor,
  unit,
}: TooltipContentProps<ValueType, NameType> & { isDark: boolean; gridColor: string; unit: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload as DailyCount;
  return (
    <div
      className="rounded-lg px-3 py-2 text-sm"
      style={{ background: isDark ? "#1a1a19" : "#fcfcfb", border: `1px solid ${gridColor}` }}
    >
      <p className={isDark ? "text-zinc-400" : "text-zinc-500"}>{data.date}</p>
      <p className={`font-medium ${isDark ? "text-zinc-50" : "text-zinc-900"}`}>
        {data.count.toLocaleString()} {unit}
      </p>
    </div>
  );
}

function Delta({ value }: { value: number }) {
  if (value === 0) return <span className="text-sm text-zinc-500 dark:text-zinc-400">— 0</span>;
  const up = value > 0;
  return (
    <span
      className={`text-sm font-medium ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
    >
      {up ? "▲" : "▼"} {Math.abs(value).toLocaleString()}
    </span>
  );
}

function StatCard({ title, unit, stats }: { title: string; unit: string; stats: WindowStats }) {
  const isDark = useIsDark();
  const color = isDark ? BAR_COLOR.dark : BAR_COLOR.light;
  const gridColor = isDark ? "#2c2c2a" : "#e1e0d9";
  const tickColor = "#898781";

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{title}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{stats.total.toLocaleString()}</p>
        <Delta value={stats.delta} />
        <span className="text-xs text-zinc-400 dark:text-zinc-500">較昨天</span>
      </div>
      <div className="mt-3 h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: tickColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: tickColor, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: gridColor, fillOpacity: 0.5 }}
              content={(props) => <CountTooltip {...props} isDark={isDark} gridColor={gridColor} unit={unit} />}
            />
            <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** 後台使用者頁上方的兩張統計卡:近 30 天加入人數、近 7 天新增交易數,各附每日長條圖。 */
export default function AdminStatsSection({
  signups,
  transactions,
}: {
  signups: WindowStats;
  transactions: WindowStats;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <StatCard title="近 30 天加入人數" unit="人" stats={signups} />
      <StatCard title="近 7 天新增交易" unit="筆" stats={transactions} />
    </div>
  );
}
