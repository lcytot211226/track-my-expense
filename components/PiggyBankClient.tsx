"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { PiggyBankMonth } from "@/lib/getPiggyBankHistory";
import { formatPeriodLabel } from "@/lib/period";
import { useIsDark } from "@/lib/useIsDark";

// 已用 dataviz 的 validate_palette.js 驗過淺色/深色各自的表面(亮度帶、對比 ≥ 3:1)
const SAVED_COLOR = { light: "#1a9b68", dark: "#27a674" };

type ChartRow = PiggyBankMonth & { label: string };

function MonthTooltip({
  active,
  payload,
  isDark,
  gridColor,
}: TooltipContentProps<ValueType, NameType> & { isDark: boolean; gridColor: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as ChartRow;
  const muted = isDark ? "text-zinc-400" : "text-zinc-500";

  return (
    <div
      className="rounded-lg px-3 py-2 text-sm"
      style={{ background: isDark ? "#1a1a19" : "#fcfcfb", border: `1px solid ${gridColor}` }}
    >
      <p className={`font-medium ${isDark ? "text-zinc-50" : "text-zinc-900"}`}>
        {row.period} · 存下 ${row.saved.toLocaleString()}
      </p>
      <p className={`mt-1 text-xs ${muted}`}>想存 ${row.amount.toLocaleString()}</p>
      <p className={`text-xs ${muted}`}>存錢前結餘 ${row.balance.toLocaleString()}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}

export default function PiggyBankClient({ months }: { months: PiggyBankMonth[] }) {
  const isDark = useIsDark();
  const color = isDark ? SAVED_COLOR.dark : SAVED_COLOR.light;
  const gridColor = isDark ? "#2c2c2a" : "#e1e0d9";
  const tickColor = "#898781";

  if (months.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-zinc-300 py-10 text-center dark:border-zinc-700">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">還沒有任何月份設定存錢罐</p>
        <Link
          href="/overview"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          到總覽設定本月存錢罐
        </Link>
      </div>
    );
  }

  const totalSaved = months.reduce((sum, m) => sum + m.saved, 0);
  const reachedCount = months.filter((m) => m.saved >= m.amount).length;
  const rows: ChartRow[] = months.map((m) => ({ ...m, label: formatPeriodLabel(m.period) }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="累計存下" value={`$${totalSaved.toLocaleString()}`} />
        <Stat label="平均每月" value={`$${Math.round(totalSaved / months.length).toLocaleString()}`} />
        <Stat label="達標月數" value={`${reachedCount} / ${months.length}`} />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 font-medium text-zinc-900 dark:text-zinc-50">每月存下金額</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
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
                cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}
                content={(props) => <MonthTooltip {...props} isDark={isDark} gridColor={gridColor} />}
              />
              <Bar dataKey="saved" name="存下" fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
