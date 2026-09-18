import Link from "next/link";
import type { CSSProperties } from "react";
import OverviewChart from "@/components/OverviewChart";
import PublicNotifications from "@/components/PublicNotifications";
import {
  ArrowPathIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  CreditCardIcon,
  HomeIcon,
  QuestionMarkCircleIcon,
  TagIcon,
  UserGroupIcon,
} from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Notification from "@/lib/models/Notification";
import {
  DEMO_CARDS,
  DEMO_CASH_TOTAL,
  DEMO_CUSTOM_ITEMS_TOTAL,
  DEMO_DAILY_BUDGET,
  DEMO_ELEC_COST,
  DEMO_DAILY_EXPENSE,
  DEMO_EXPENSE_PREVIEW,
  DEMO_INCOME_PREVIEW,
  DEMO_INCOME_TOTAL,
  DEMO_INSTALLMENT_TOTAL,
  DEMO_REMAINING_DAYS,
  DEMO_RENT,
  DEMO_SHARED_ITEM,
  DEMO_SUBSCRIPTION_TOTAL,
  DEMO_TOTAL_EXPENSE,
  DEMO_UTILITY_COST,
  DEMO_WATER_COST,
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
    title: "訂閱固定扣款免手動記",
    description: "Netflix、房租清潔這類每月固定扣款,設定一次起始日和金額,之後每個月到期自動幫你補上一筆。",
    color: { light: "#0891b2", dark: "#0ea5c7" },
    icon: (
      <>
        <path d="M4 12a8 8 0 0 1 14-5.3" />
        <path d="M20 12a8 8 0 0 1-14 5.3" />
        <path d="M18 3.7v3h-3" />
        <path d="M6 20.3v-3h3" />
      </>
    ),
  },
  {
    title: "房租水電自動試算",
    description: "電費、水費都能用「電表度數 × 單價」自動算,也能直接輸入帳單金額;租金/電費/水費還能各自決定要不要計入當月支出。",
    color: { light: "#1baf7a", dark: "#199e70" },
    icon: <path d="m13 2-9 12h6l-1 8 9-12h-6l1-8Z" />,
  },
  {
    title: "每日可花預算試算",
    description: "設定自己的月結算日,系統會自動用「當月結餘 ÷ 剩餘天數」算出平均每天還能花多少,超支就直接顯示 NaN。",
    color: { light: "#8b5cf6", dark: "#7c4fe0" },
    icon: <path d="M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />,
  },
  {
    title: "跨帳號分享開銷",
    description: "把某個項目的當月總額(例如房租水電、某張卡的刷卡總額)分享給任何 email,對方可以自己決定要不要算進自己的支出,很適合合租或家人分攤。",
    color: { light: "#e0457b", dark: "#d13a6d" },
    icon: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
        <circle cx="17" cy="9" r="2.3" />
        <path d="M14.7 13.2a4.6 4.6 0 0 1 5.8 4.4" />
      </>
    ),
  },
  {
    title: "系統公告通知",
    description: "有新公告時導覽列的鈴鐺會提醒你,右上角也能隨時查看最新公告,不用登入也能先看一眼。",
    color: { light: "#eda100", dark: "#c98500" },
    icon: (
      <>
        <path d="M6 8.5a6 6 0 1 1 12 0c0 3.3 1 5.3 1.6 6.2.35.5-.02 1.3-.63 1.3H5.03c-.6 0-.98-.8-.63-1.3C5 13.8 6 11.8 6 8.5Z" />
        <path d="M9.5 18.3a2.5 2.5 0 0 0 5 0" />
      </>
    ),
  },
  {
    title: "手機也好用",
    description: "支援深色/淺色模式與響應式版面,手機隨手記一筆也不卡。",
    color: { light: "#71717a", dark: "#a1a1aa" },
    icon: <path d="M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm4 15h.01" />,
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  const ctaHref = user ? "/overview" : "/login";
  const ctaLabel = user ? "前往總覽" : "立即開始";

  await connectToDatabase();
  const notificationDocs = await Notification.find().sort({ createdAt: -1 }).limit(5).lean();
  const notifications = notificationDocs.map((n) => ({
    _id: n._id.toString(),
    title: n.title,
    content: n.content,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">記帳本</span>
          <div className="flex items-center gap-2">
            <PublicNotifications notifications={notifications} />
            {user ? (
              <Link
                href="/overview"
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                前往總覽
              </Link>
            ) : (
              <>
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
              </>
            )}
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
            href={ctaHref}
            className="mt-2 rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {ctaLabel}
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
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
            <h3 className="mb-3 flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-50">
              <HomeIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              房租水電(可直接編輯,不用跳頁)
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
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
                <p className="text-xs text-zinc-400 dark:text-zinc-500">${DEMO_ELEC_COST.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">水表(起/迄)</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">210 / 225</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">${DEMO_WATER_COST.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">房租水電小計</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">${DEMO_UTILITY_COST.toLocaleString()}</p>
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
                  含房租水電 ${DEMO_UTILITY_COST.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">結餘</p>
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  ${(DEMO_INCOME_TOTAL - DEMO_TOTAL_EXPENSE).toLocaleString()}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  距結算日還有 {DEMO_REMAINING_DAYS} 天,每日可花{" "}
                  {DEMO_DAILY_BUDGET != null ? `$${Math.floor(DEMO_DAILY_BUDGET).toLocaleString()}` : "NaN"}
                </p>
              </div>
            </div>

            <hr className="mb-4 border-zinc-200 dark:border-zinc-800" />

            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-zinc-200 p-3 text-center dark:border-zinc-800">
                <p className="flex items-center justify-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                  <BanknotesIcon className="h-4 w-4" />
                  現金開銷
                </p>
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  ${DEMO_CASH_TOTAL.toLocaleString()}
                </p>
              </div>
              <div className="rounded-md border border-zinc-200 p-3 text-center dark:border-zinc-800">
                <p className="flex items-center justify-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                  <TagIcon className="h-4 w-4" />
                  自訂項目總開銷
                </p>
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  ${DEMO_CUSTOM_ITEMS_TOTAL.toLocaleString()}
                </p>
              </div>
              <div className="rounded-md border border-zinc-200 p-3 text-center dark:border-zinc-800">
                <p className="flex items-center justify-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                  <CalendarDaysIcon className="h-4 w-4" />
                  分期總開銷
                </p>
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  ${DEMO_INSTALLMENT_TOTAL.toLocaleString()}
                </p>
              </div>
              <div className="rounded-md border border-zinc-200 p-3 text-center dark:border-zinc-800">
                <p className="flex items-center justify-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                  <ArrowPathIcon className="h-4 w-4" />
                  訂閱總開銷
                </p>
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  ${DEMO_SUBSCRIPTION_TOTAL.toLocaleString()}
                </p>
              </div>
              <div className="relative rounded-md border border-dashed border-zinc-300 p-3 text-center dark:border-zinc-700">
                <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <p className="flex items-center justify-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                  <UserGroupIcon className="h-4 w-4" />
                  共享總額(虛擬)
                </p>
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  ${DEMO_SHARED_ITEM.amount.toLocaleString()}
                </p>
                <p className="mt-1 truncate text-xs text-zinc-400 dark:text-zinc-500">
                  {DEMO_SHARED_ITEM.ownerEmail} 分享的{DEMO_SHARED_ITEM.label}
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
            <h3 className="mb-3 flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-50">
              <CreditCardIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              信用卡管理與本月對帳
            </h3>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DEMO_CARDS.map((card) => (
                <li
                  key={card.name}
                  className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{card.name}</p>
                    <span
                      className={`flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${
                        card.reconciled
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                          : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                      }`}
                    >
                      {card.reconciled ? (
                        <>
                          <CheckCircleIcon className="h-3.5 w-3.5" />
                          已對帳
                        </>
                      ) : (
                        <>
                          <QuestionMarkCircleIcon className="h-3.5 w-3.5" />
                          未對帳
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    結帳日 {card.closingDate} 號 / 繳款日 {card.paymentDate} 號
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    本月刷卡 ${card.total.toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-5xl px-4 pb-16 text-center">
        <Link
          href={ctaHref}
          className="inline-block rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {ctaLabel}
        </Link>
      </footer>
    </div>
  );
}
