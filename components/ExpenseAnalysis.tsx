"use client";

import { useState, type ReactNode } from "react";
import Modal from "./Modal";
import type { TransactionDTO } from "./TransactionsClient";
import { CalendarDaysIcon, ChartBarIcon, TagIcon } from "./icons";

const TOP_N = 3;
/** 每一天底下預設最多列出幾筆支出,不足補空行、超過收進「其他 N 筆」點開才顯示 */
const DAY_ITEMS_PREVIEW = 3;
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

const CATEGORY_LABEL: Record<TransactionDTO["category"], string> = {
  cash: "現金",
  credit_card: "信用卡",
  installment: "分期",
};

const CATEGORY_CHIP: Record<TransactionDTO["category"], string> = {
  cash: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  credit_card: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  installment: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
};

// 第 1/2/3 名的金/銀/銅徽章
const RANK_BADGE = [
  "bg-amber-400 text-amber-950",
  "bg-slate-300 text-slate-800 dark:bg-slate-400 dark:text-slate-950",
  "bg-orange-300 text-orange-950 dark:bg-orange-400",
];

// 單日組成長條:前三筆各自一個顏色(跟下方清單的圓點對應),其餘併成灰色的「其他」
const SEGMENT_COLORS = ["bg-rose-500", "bg-amber-400", "bg-sky-500"];
const OTHER_SEGMENT_COLOR = "bg-zinc-300 dark:bg-zinc-600";

type TopDay = { date: string; total: number; items: TransactionDTO[] };

function money(amount: number) {
  return `$${amount.toLocaleString()}`;
}

function percent(part: number, whole: number) {
  if (whole <= 0) return "0%";
  const p = (part / whole) * 100;
  return `${p < 10 ? p.toFixed(1) : Math.round(p)}%`;
}

/** "YYYY-MM-DD" → "MM/DD",跟每日支出圖表的 x 軸一致 */
function formatDate(dateKey: string) {
  return `${dateKey.slice(5, 7)}/${dateKey.slice(8, 10)}`;
}

function weekday(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return `週${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}`;
}

function RankBadge({ rank, empty }: { rank: number; empty?: boolean }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
        empty
          ? "border border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-700 dark:text-zinc-600"
          : RANK_BADGE[rank - 1]
      }`}
    >
      {rank}
    </span>
  );
}

function CategoryChip({ t }: { t: TransactionDTO }) {
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${CATEGORY_CHIP[t.category]}`}>
      {CATEGORY_LABEL[t.category]}
    </span>
  );
}

function SectionTitle({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {icon}
        {title}
      </h3>
      {hint && <span className="text-xs text-zinc-400 dark:text-zinc-500">{hint}</span>}
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
      {sub && <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">{sub}</p>}
    </div>
  );
}

function ItemLine({ t, dotClass }: { t: TransactionDTO; dotClass: string }) {
  return (
    <li className="flex h-5 items-center justify-between gap-3 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} />
        <span className="truncate text-zinc-700 dark:text-zinc-200">{t.item}</span>
        <CategoryChip t={t} />
      </span>
      <span className="shrink-0 tabular-nums text-zinc-600 dark:text-zinc-300">{money(t.amount)}</span>
    </li>
  );
}

/**
 * 單日排名卡:長條長度 = 當天總額相對第 1 名的比例,長條內再依各筆支出切成不同顏色,
 * 一眼看出那天的錢主要花在哪。`day` 為 null 時畫同樣結構的空白佔位,確保高度一致。
 */
function DayRankCard({
  rank,
  day,
  maxTotal,
  monthTotal,
}: {
  rank: number;
  day: TopDay | null;
  maxTotal: number;
  monthTotal: number;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!day) {
    return (
      <li className="rounded-lg border border-dashed border-zinc-200 p-3 dark:border-zinc-800">
        <div className="flex h-10 items-center gap-3">
          <RankBadge rank={rank} empty />
          <span className="text-sm text-zinc-400 dark:text-zinc-600">尚無資料</span>
        </div>
        <div className="mt-3 h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800" />
        <ul className="mt-3 flex flex-col gap-1.5" aria-hidden="true">
          {Array.from({ length: DAY_ITEMS_PREVIEW }, (_, i) => (
            <li key={i} className="h-5" />
          ))}
        </ul>
      </li>
    );
  }

  const preview = day.items.slice(0, DAY_ITEMS_PREVIEW);
  const rest = day.items.slice(DAY_ITEMS_PREVIEW);
  const restTotal = rest.reduce((sum, t) => sum + t.amount, 0);
  const padCount = Math.max(0, DAY_ITEMS_PREVIEW - day.items.length);
  const barWidth = maxTotal > 0 ? (day.total / maxTotal) * 100 : 0;

  return (
    <li className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex h-10 items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <RankBadge rank={rank} />
          <div>
            <p className="font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
              {formatDate(day.date)}
              <span className="ml-1.5 text-xs font-normal text-zinc-500 dark:text-zinc-400">{weekday(day.date)}</span>
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{day.items.length} 筆支出</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold leading-tight text-rose-600 dark:text-rose-400">{money(day.total)}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">佔本月 {percent(day.total, monthTotal)}</p>
        </div>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className="flex h-full gap-px" style={{ width: `${barWidth}%` }}>
          {preview.map((t, i) => (
            <div
              key={t._id}
              className={SEGMENT_COLORS[i]}
              style={{ width: `${(t.amount / day.total) * 100}%` }}
              title={`${t.item} ${money(t.amount)}`}
            />
          ))}
          {restTotal > 0 && (
            <div className={OTHER_SEGMENT_COLOR} style={{ width: `${(restTotal / day.total) * 100}%` }} />
          )}
        </div>
      </div>

      <ul className="mt-3 flex flex-col gap-1.5">
        {preview.map((t, i) => (
          <ItemLine key={t._id} t={t} dotClass={SEGMENT_COLORS[i]} />
        ))}
        {Array.from({ length: padCount }, (_, i) => (
          <li key={`pad-${i}`} aria-hidden="true" className="flex h-5 items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700" />
            <span className="flex-1 border-t border-dashed border-zinc-200 dark:border-zinc-800" />
          </li>
        ))}
        {expanded && rest.map((t) => <ItemLine key={t._id} t={t} dotClass={OTHER_SEGMENT_COLOR} />)}
      </ul>

      {rest.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="mt-2 flex w-full items-center justify-between rounded-md bg-zinc-50 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <span className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${OTHER_SEGMENT_COLOR}`} />
            {expanded ? "收合" : `其他 ${rest.length} 筆`}
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            {!expanded && money(restTotal)}
            <span className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>▾</span>
          </span>
        </button>
      )}
    </li>
  );
}

/** 單筆排名列:底下的細長條表示這筆佔本月支出的比例。`t` 為 null 時畫空白佔位 */
function ItemRankRow({ rank, t, monthTotal }: { rank: number; t: TransactionDTO | null; monthTotal: number }) {
  if (!t) {
    return (
      <li className="rounded-lg border border-dashed border-zinc-200 p-3 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <RankBadge rank={rank} empty />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-5 text-zinc-400 dark:text-zinc-600">尚無資料</p>
            <p className="h-5" />
          </div>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800" />
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-center gap-3">
        <RankBadge rank={rank} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-semibold leading-5 text-zinc-900 dark:text-zinc-50">{t.item}</p>
            <p className="shrink-0 font-semibold leading-5 text-rose-600 dark:text-rose-400">{money(t.amount)}</p>
          </div>
          <div className="flex h-5 items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex min-w-0 items-center gap-1.5">
              <CategoryChip t={t} />
              <span className="truncate">
                {formatDate(t.date.slice(0, 10))}
                {t.card ? ` · ${t.card.name}` : ""}
                {t.installmentInfo ? ` · 第${t.installmentInfo.currentNumber}/${t.installmentInfo.totalNumber}期` : ""}
                {t.subscription ? " · 訂閱" : ""}
              </span>
            </span>
            <span className="shrink-0">佔本月 {percent(t.amount, monthTotal)}</span>
          </div>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-rose-500"
          style={{ width: `${monthTotal > 0 ? (t.amount / monthTotal) * 100 : 0}%` }}
        />
      </div>
    </li>
  );
}

/**
 * /overview 每日支出下方的「分析」按鈕 + dialog。
 * 只做前端統計,資料直接用 OverviewClient 已載入、且跟圖表同樣篩選(是否含分期訂閱)的支出清單。
 */
export default function ExpenseAnalysis({
  period,
  expenses,
  includesInstallment,
}: {
  period: string;
  expenses: TransactionDTO[];
  includesInstallment: boolean;
}) {
  const [open, setOpen] = useState(false);

  const positive = expenses.filter((t) => t.amount > 0);
  const monthTotal = positive.reduce((sum, t) => sum + t.amount, 0);

  // 以交易實際日期為單位加總,取總額最高的前三天
  const byDate = new Map<string, TransactionDTO[]>();
  for (const t of positive) {
    const key = t.date.slice(0, 10);
    const list = byDate.get(key) ?? [];
    list.push(t);
    byDate.set(key, list);
  }
  const allDays: TopDay[] = Array.from(byDate, ([date, items]) => ({
    date,
    total: items.reduce((sum, t) => sum + t.amount, 0),
    items: [...items].sort((a, b) => b.amount - a.amount),
  }));
  const topDays = [...allDays].sort((a, b) => b.total - a.total || a.date.localeCompare(b.date)).slice(0, TOP_N);

  const topItems = [...positive]
    .sort((a, b) => b.amount - a.amount || a.date.localeCompare(b.date))
    .slice(0, TOP_N);

  const spendDays = allDays.length;
  const avgPerSpendDay = spendDays > 0 ? Math.round(monthTotal / spendDays) : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <ChartBarIcon className="h-4 w-4" />
        分析
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`${period} 支出分析`}>
        <div className="flex flex-col gap-6">
          <div>
            <div className="grid grid-cols-3 gap-2">
              <StatTile label="支出合計" value={money(monthTotal)} sub={`${positive.length} 筆`} />
              <StatTile label="有花錢的天數" value={`${spendDays} 天`} />
              <StatTile label="平均每天" value={money(avgPerSpendDay)} sub="以有花錢的天數計" />
            </div>
            <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
              統計範圍與上方圖表相同:{includesInstallment ? "已包含" : "不含"}分期與訂閱。
            </p>
          </div>

          <section>
            <SectionTitle
              icon={<CalendarDaysIcon className="h-4 w-4 text-sky-500" />}
              title="花最多的三天"
              hint="長條依當天各筆支出分色"
            />
            <ol className="flex flex-col gap-3">
              {Array.from({ length: TOP_N }, (_, i) => (
                <DayRankCard
                  key={topDays[i]?.date ?? `empty-${i}`}
                  rank={i + 1}
                  day={topDays[i] ?? null}
                  maxTotal={topDays[0]?.total ?? 0}
                  monthTotal={monthTotal}
                />
              ))}
            </ol>
          </section>

          <section>
            <SectionTitle
              icon={<TagIcon className="h-4 w-4 text-rose-500" />}
              title="最貴的三筆"
              hint="長條為佔本月支出比例"
            />
            <ol className="flex flex-col gap-2">
              {Array.from({ length: TOP_N }, (_, i) => (
                <ItemRankRow
                  key={topItems[i]?._id ?? `empty-${i}`}
                  rank={i + 1}
                  t={topItems[i] ?? null}
                  monthTotal={monthTotal}
                />
              ))}
            </ol>
          </section>
        </div>
      </Modal>
    </>
  );
}
