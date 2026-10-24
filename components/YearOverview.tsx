"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { useIsDark } from "@/lib/useIsDark";
import Modal from "./Modal";
import MonthRangePicker, { FULL_YEAR, type MonthRange } from "./MonthRangePicker";
import {
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CreditCardIcon,
  ListIcon,
  HomeIcon,
  PiggyBankIcon,
  ScaleIcon,
  TagIcon,
  UserGroupIcon,
} from "./icons";

const INCOME_COLOR = { light: "#1a9b68", dark: "#27a674" };
// 紅綠對色盲讀者分辨度偏低(validator CVD ΔE ≈ 6,落在需要輔助編碼的區間):
// 收入固定在每組長條的左邊、支出在右,加上圖例與 tooltip 文字標示,不單靠顏色區分
const EXPENSE_COLOR = { light: "#e5484d", dark: "#e34948" };

type YearMonth = {
  period: string;
  income: number;
  expense: number;
  balance: number;
  cash: number;
  installment: number;
  subscription: number;
  utility: number;
  customItems: number;
  piggyBank: number;
  cards: { card: string; total: number }[];
  /** 別人分享給我、且目前勾選納入的項目淨額(收入為正、支出為負) */
  sharedNet: number;
};

type YearCard = { _id: string; name: string; isDebit: boolean };

type YearData = { year: number; months: YearMonth[]; cards: YearCard[] };

type ChartRow = YearMonth & { label: string };

/** 共享總額計入統計時,跟月檢視一樣:淨額為正加進收入、為負加進支出,結餘跟著重算。 */
function withShared(m: YearMonth): YearMonth {
  const income = m.income + Math.max(m.sharedNet, 0);
  const expense = m.expense + Math.max(-m.sharedNet, 0);
  return { ...m, income, expense, balance: income - expense };
}

function money(n: number) {
  return `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString()}`;
}

function sumOf(
  months: YearMonth[],
  key: "income" | "expense" | "balance" | "cash" | "installment" | "subscription" | "utility" | "customItems" | "piggyBank" | "sharedNet"
) {
  return months.reduce((total, m) => total + m[key], 0);
}

function MonthTooltip({
  active,
  payload,
  isDark,
  gridColor,
}: TooltipContentProps<ValueType, NameType> & { isDark: boolean; gridColor: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as ChartRow;
  const muted = isDark ? "text-zinc-400" : "text-zinc-500";
  const strong = isDark ? "text-zinc-50" : "text-zinc-900";

  return (
    <div
      className="rounded-lg px-3 py-2 text-sm"
      style={{ background: isDark ? "#1a1a19" : "#fcfcfb", border: `1px solid ${gridColor}` }}
    >
      <p className={`font-medium ${strong}`}>{row.period}</p>
      <p className={`mt-1 text-xs ${muted}`}>收入 {money(row.income)}</p>
      <p className={`text-xs ${muted}`}>支出 {money(row.expense)}</p>
      <p className={`text-xs ${muted}`}>結餘 {money(row.balance)}</p>
    </div>
  );
}

function Stat({ label, value, Icon }: { label: string; value: string; Icon: typeof ScaleIcon }) {
  return (
    <div>
      <p className="flex items-center justify-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
        <Icon className="h-4 w-4" />
        {label}
      </p>
      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}

function Tile({ label, value, Icon }: { label: string; value: string; Icon: typeof ScaleIcon }) {
  return (
    <div className="rounded-md border border-zinc-200 p-3 text-center dark:border-zinc-800">
      <p className="flex items-center justify-center gap-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </p>
      <p className="break-words font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}

/**
 * /overview 的年度檢視:一次看一整年每個月的收支,資料來自 OverviewSummary 快取(GET /api/overview/year),
 * 另附每月共享總額(別人分享給我、目前勾選納入的項目淨額),可切換是否計入收入 / 支出 / 結餘。點某個月份(長條或列表)切回該月的月檢視。
 */
export default function YearOverview({
  year,
  onYearChange,
  onSelectMonth,
  headerRight,
}: {
  year: number;
  onYearChange: (year: number) => void;
  onSelectMonth: (period: string) => void;
  /** 年份選擇器右邊的內容(總覽的月 / 年切換鈕) */
  headerRight?: ReactNode;
}) {
  const isDark = useIsDark();
  const [data, setData] = useState<YearData | null>(null);
  const [error, setError] = useState(false);
  // 共享總額是否計入收入 / 支出 / 結餘,預設納入(同月檢視)
  const [includeShared, setIncludeShared] = useState(true);
  // 統計的月份區間,記著是哪一年選的;換一年就回到預設的 1–12 月
  const [rangeOverride, setRangeOverride] = useState<{ year: number; range: MonthRange } | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetch(`/api/overview/year?year=${year}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json: YearData) => {
        if (ignore) return;
        setData(json);
        setError(false);
      })
      .catch(() => {
        if (!ignore) setError(true);
      });
    return () => {
      ignore = true;
    };
  }, [year]);

  const loading = !data || data.year !== year;
  // 例如 9 月才開始記帳、或這個月還沒記完,就可以只看 9 月到上個月
  const range = rangeOverride?.year === year ? rangeOverride.range : FULL_YEAR;
  const isFullYear = range.start === 1 && range.end === 12;
  const rangeLabel = isFullYear ? "全年" : `${range.start}–${range.end} 月`;
  const rawMonths = (data?.months ?? []).filter((m) => {
    const month = Number(m.period.slice(5));
    return month >= range.start && month <= range.end;
  });
  const months = includeShared ? rawMonths.map(withShared) : rawMonths;
  const sharedTotal = sumOf(rawMonths, "sharedNet");
  const incomeColor = isDark ? INCOME_COLOR.dark : INCOME_COLOR.light;
  const expenseColor = isDark ? EXPENSE_COLOR.dark : EXPENSE_COLOR.light;
  const gridColor = isDark ? "#2c2c2a" : "#e1e0d9";
  const tickColor = "#898781";

  const income = sumOf(months, "income");
  const expense = sumOf(months, "expense");
  const balance = sumOf(months, "balance");
  // 平均只算有收支紀錄的月份,未來或沒記帳的月份不拉低平均
  const activeMonths = months.filter((m) => m.income !== 0 || m.expense !== 0).length;
  const rows: ChartRow[] = months.map((m) => ({ ...m, label: `${Number(m.period.slice(5))}月` }));

  const cardTotals = new Map<string, number>();
  for (const m of months) {
    for (const c of m.cards) cardTotals.set(c.card, (cardTotals.get(c.card) ?? 0) + c.total);
  }
  const cardNameById = new Map((data?.cards ?? []).map((c) => [c._id, c.name]));
  // 先列現有的卡(依建立順序),再列已刪除但這年還有金額的卡
  const cardRows = [
    ...(data?.cards ?? []).map((c) => ({ id: c._id, name: c.name, total: cardTotals.get(c._id) ?? 0 })),
    ...Array.from(cardTotals)
      .filter(([id]) => !cardNameById.has(id))
      .map(([id, total]) => ({ id, name: "已刪除的信用卡", total })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onYearChange(year - 1)}
            aria-label="上一年"
            className="rounded-md border border-zinc-300 px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            ◀
          </button>
          <span className="min-w-20 rounded-md border border-zinc-300 px-3 py-2 text-center text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50">
            {year} 年
          </span>
          <button
            type="button"
            onClick={() => onYearChange(year + 1)}
            aria-label="下一年"
            className="rounded-md border border-zinc-300 px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            ▶
          </button>
        </div>
        <div className="mr-auto">
          <MonthRangePicker value={range} onChange={(next) => setRangeOverride({ year, range: next })} />
        </div>
        {headerRight}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">年度資料載入失敗,請稍後再試</p>}

      {/* 切換年份時先保留上一年的畫面(變淡),新資料回來再換掉,避免整塊閃掉 */}
      <div className={`flex flex-col gap-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
            <Stat label="年收入" value={money(income)} Icon={ArrowUpCircleIcon} />
            <Stat label="年支出" value={money(expense)} Icon={ArrowDownCircleIcon} />
            <Stat label="年結餘" value={money(balance)} Icon={ScaleIcon} />
            <Stat
              label="月平均支出"
              value={activeMonths > 0 ? money(Math.round(expense / activeMonths)) : "-"}
              Icon={CalendarDaysIcon}
            />
          </div>

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-50">
              <ChartBarIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              {year} 每月收支{isFullYear ? "" : `(${rangeLabel})`}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: incomeColor }} />
                收入
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: expenseColor }} />
                支出
              </span>
              {/* 跟下方「共享總額」格子是同一個開關 */}
              <button
                type="button"
                onClick={() => setIncludeShared((prev) => !prev)}
                aria-pressed={includeShared}
                aria-label={includeShared ? "已計入共享總額,點擊取消" : "計入共享總額"}
                title={includeShared ? "已計入共享總額,點擊取消" : "計入共享總額"}
                className={`flex items-center rounded-md border p-1.5 transition-colors ${
                  includeShared
                    ? "border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300"
                    : "border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
                }`}
              >
                <UserGroupIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 16, right: 16, left: 0, bottom: 0 }} barGap={2}>
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
                <Bar
                  dataKey="income"
                  name="收入"
                  fill={incomeColor}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
                  cursor="pointer"
                  onClick={(_, index) => onSelectMonth(rows[index].period)}
                />
                <Bar
                  dataKey="expense"
                  name="支出"
                  fill={expenseColor}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
                  cursor="pointer"
                  onClick={(_, index) => onSelectMonth(rows[index].period)}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">點長條可切到該月</p>
            <button
              type="button"
              onClick={() => setShowTable(true)}
              className="flex shrink-0 items-center gap-1 rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <ListIcon className="h-3.5 w-3.5" />
              明細表
            </button>
          </div>
        </div>

        <Modal open={showTable} onClose={() => setShowTable(false)} title={`${year} 每月明細`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-2 py-2 text-left font-medium">月份</th>
                <th className="px-2 py-2 text-right font-medium">收入</th>
                <th className="px-2 py-2 text-right font-medium">支出</th>
                <th className="px-2 py-2 text-right font-medium">結餘</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr
                  key={m.period}
                  onClick={() => onSelectMonth(m.period)}
                  className="cursor-pointer border-b border-zinc-100 text-zinc-900 transition-colors last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:text-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMonth(m.period);
                      }}
                      aria-label={`查看 ${m.period}`}
                      className="text-left"
                    >
                      {m.label}
                    </button>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(m.income)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(m.expense)}</td>
                  <td
                    className={`px-2 py-2 text-right tabular-nums ${m.balance < 0 ? "text-red-600 dark:text-red-400" : ""}`}
                  >
                    {money(m.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200 font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                <td className="px-2 py-2">合計</td>
                <td className="px-2 py-2 text-right tabular-nums">{money(income)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{money(expense)}</td>
                <td className={`px-2 py-2 text-right tabular-nums ${balance < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                  {money(balance)}
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">點某個月份可切到該月的月檢視</p>
        </Modal>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          {cardRows.length > 0 && (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  <CreditCardIcon className="h-4 w-4" />
                  信用卡
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  合計{" "}
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {money(cardRows.reduce((sum, c) => sum + c.total, 0))}
                  </span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {cardRows.map((c) => (
                  <Tile key={c.id} label={c.name} value={money(c.total)} Icon={CreditCardIcon} />
                ))}
              </div>
            </>
          )}
          <h3
            className={`mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 ${cardRows.length > 0 ? "mt-4" : ""}`}
          >
            {rangeLabel}支出分項
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Tile label="現金" value={money(sumOf(months, "cash"))} Icon={BanknotesIcon} />
            <Tile
              label="分期 / 訂閱"
              value={`${money(sumOf(months, "installment"))} / ${money(sumOf(months, "subscription"))}`}
              Icon={CalendarDaysIcon}
            />
            <Tile label="房租水電" value={money(sumOf(months, "utility"))} Icon={HomeIcon} />
            <Tile label="自訂項目" value={money(sumOf(months, "customItems"))} Icon={TagIcon} />
            <Tile label="存錢罐" value={money(sumOf(months, "piggyBank"))} Icon={PiggyBankIcon} />
            <button
              type="button"
              onClick={() => setIncludeShared((prev) => !prev)}
              aria-pressed={includeShared}
              title="點擊切換是否計入上方統計:別人分享給我、且目前勾選納入的項目,收入減支出的全年淨額。開啟時,每個月的正值加進收入、負值加進支出。"
              className="relative w-full rounded-md border border-dashed border-zinc-300 p-3 text-center dark:border-zinc-700"
            >
              <span
                className={`absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full ${
                  includeShared ? "bg-indigo-400" : "bg-zinc-300 dark:bg-zinc-600"
                }`}
              />
              <p className="flex items-center justify-center gap-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
                <UserGroupIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">共享總額(虛擬)</span>
              </p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">{money(sharedTotal)}</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
