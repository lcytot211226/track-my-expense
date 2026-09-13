"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const STORAGE_KEY = "trackMyExpense:period";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * 選取的月份(period)在頁面間、重新整理後都會被記住:有帶 ?period= 就優先用網址上的值,
 * 否則回讀 localStorage 上次選過的月份。
 *
 * `ready` 在網址已帶 period 時一開始就是 true;否則要等掛載後讀完 localStorage 才會變 true。
 * 呼叫端應該等 ready 才開始 fetch 資料,避免「先用猜的月份抓一次、讀完 localStorage 後又用
 * 正確月份再抓一次」造成畫面資料閃爍(一下有資料、一下沒資料)。
 */
export function usePeriod() {
  const searchParams = useSearchParams();
  const urlPeriod = searchParams.get("period");
  const [period, setPeriodState] = useState(urlPeriod ?? currentPeriod());
  const [ready, setReady] = useState(Boolean(urlPeriod));

  useEffect(() => {
    if (urlPeriod) return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // 讀取上次選擇的月份(外部系統 localStorage),僅在掛載時同步一次。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setPeriodState(stored);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setPeriod(next: string) {
    setPeriodState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return { period, setPeriod, ready };
}
