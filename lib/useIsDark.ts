"use client";

import { useSyncExternalStore } from "react";

function subscribeToThemeChange(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getIsDarkSnapshot() {
  return document.documentElement.classList.contains("dark");
}

/** 目前 <html> 是否套用 .dark(圖表配色要跟著切換);監聽 class 變化,切換主題時即時更新。 */
export function useIsDark() {
  return useSyncExternalStore(subscribeToThemeChange, getIsDarkSnapshot, () => false);
}
