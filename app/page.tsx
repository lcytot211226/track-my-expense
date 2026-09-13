import Link from "next/link";
import type { CSSProperties } from "react";
import OverviewChart from "@/components/OverviewChart";
import {
  DEMO_CARDS,
  DEMO_ELEC_COST,
  DEMO_DAILY_EXPENSE,
  DEMO_EXPENSE_PREVIEW,
  DEMO_INCOME_PREVIEW,
  DEMO_INCOME_TOTAL,
  DEMO_RENT,
  DEMO_TOTAL_EXPENSE,
  DEMO_UTILITY_COST,
} from "@/lib/demoData";

const FEATURES = [
  {
    title: "信用卡結帳日自動判斷",
    description: "輸入卡片的結帳日/繳款日,消費會自動算出實際入帳月份,不用自己心算跨月的帳單。",
    color: { light: "#2a78d6", dark: "#3987e5" },
    icon: (
      <path d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Zm0 4h20M6 15h4" />
    ),
  },
  {
    title: "分期一次搞定",
    description: "輸入總金額和期數,自動生成每一期的紀錄和金額;之後要刪,一鍵整組刪掉,不用一筆一筆找。",
    color: { light: "#eb6834", dark: "#d95926" },
    icon: <path d="M4 7h13M4 7l3-3M4 7l3 3M20 17H7M20 17l-3-3M20 17l-3 3" />,
  },
  {
    title: "房租電費自動試算",
    description: "電表度數 × 每度電價自動算出電費,也可以直接輸入帳單金額,兩種算法都支援。",
    color: { light: "#1baf7a", dark: "#199e70" },
    icon: <path d="m13 2-9 12h6l-1 8 9-12h-6l1-8Z" />,
  },
  {
    title: "手機也好用",
    description: "支援深色/淺色模式與響應式版面,手機隨手記一筆也不卡。",
    color: { light: "#eda100", dark: "#c98500" },
    icon: <path d="M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm4 15h.01" />,
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">記帳本</span>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              登入
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              註冊
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, color-mix(in srgb, #2a78d6 12%, transparent), transparent)",
          }}
        />
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-16 text-center">
          <h1 className="text-3xl font-semibold text-zinc-900 sm:text-4xl dark:text-zinc-50">
            懂<span className="text-[#2a78d6] dark:text-[#3987e5]">信用卡帳單邏輯</span>的記帳本
          </h1>
          <p className="max-w-xl text-zinc-500 dark:text-zinc-400">
            不只是記錄花了多少錢,而是照著結帳日、繳款日、分期期數,幫你算出這筆錢到底會出現在哪個月的帳單裡。
          </p>
          <Link
            href="/register"
            className="mt-2 rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            立即開始
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-4 pb-16 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: `color-mix(in srgb, ${feature.color.light} 15%, transparent)` }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 [color:var(--feature-icon-light)] dark:[color:var(--feature-icon-dark)]"
                style={
                  {
                    "--feature-icon-light": feature.color.light,
                    "--feature-icon-dark": feature.color.dark,
                  } as CSSProperties
                }
              >
                {feature.icon}
              </svg>
            </div>
            <h2 className="mb-1 font-medium text-zinc-900 dark:text-zinc-50">{feature.title}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{feature.description}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-20">
        <div className="mb-4 flex items-baseline gap-2">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">實際畫面長這樣</h2>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">(示範資料,非真實帳戶)</span>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-2 font-medium text-zinc-900 dark:text-zinc-50">2026-09 每日支出</h3>
            <OverviewChart dailyExpense={DEMO_DAILY_EXPENSE} />
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-3 font-medium text-zinc-900 dark:text-zinc-50">房租電費</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">帳單日</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">5 號</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">租金</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">${DEMO_RENT.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">電表(起/迄)</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">8500 / 8820</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">電費</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">${DEMO_ELEC_COST.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">收入</p>
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  ${DEMO_INCOME_TOTAL.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">支出</p>
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  ${DEMO_TOTAL_EXPENSE.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  含房租電費 ${DEMO_UTILITY_COST.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">結餘</p>
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  ${(DEMO_INCOME_TOTAL - DEMO_TOTAL_EXPENSE).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">收入預覽</p>
                <ul className="flex flex-col gap-2">
                  {DEMO_INCOME_PREVIEW.map((t) => (
                    <li key={t.item} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-zinc-700 dark:text-zinc-300">{t.item}</p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          {t.date} · {t.payment}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
                        ${t.amount.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">支出預覽</p>
                <ul className="flex flex-col gap-2">
                  {DEMO_EXPENSE_PREVIEW.map((t, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-zinc-700 dark:text-zinc-300">{t.item}</p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          {t.date} · {t.payment}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
                        ${t.amount.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-3 font-medium text-zinc-900 dark:text-zinc-50">信用卡管理</h3>
            <ul className="flex flex-col gap-2">
              {DEMO_CARDS.map((card) => (
                <li
                  key={card.name}
                  className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">{card.name}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    結帳日 {card.closingDate} 號 / 繳款日 {card.paymentDate} 號
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-5xl px-4 pb-16 text-center">
        <Link
          href="/register"
          className="inline-block rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          立即開始
        </Link>
      </footer>
    </div>
  );
}
