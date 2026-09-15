"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useToast } from "./ToastProvider";

// 導頁通常很快,延遲一小段時間再顯示,避免快速切換時提示閃一下就消失。
const SHOW_DELAY_MS = 200;

function resolveInternalPath(anchor: HTMLAnchorElement): string | null {
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;
  let url: URL;
  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  return url.pathname + url.search;
}

export default function RouteChangeToast() {
  const pathname = usePathname();
  const { showLoading, dismiss } = useToast();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastIdRef = useRef<string | null>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const targetPath = resolveInternalPath(anchor);
      if (!targetPath) return;

      const currentPath = window.location.pathname + window.location.search;
      if (targetPath === currentPath) return;

      timeoutRef.current = setTimeout(() => {
        toastIdRef.current = showLoading("頁面載入中…");
      }, SHOW_DELAY_MS);
    }

    // 用 capture phase 監聽,搶在 next/link 的 onClick(會呼叫 preventDefault)之前先讀到這次點擊。
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [showLoading]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (toastIdRef.current) {
      dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, [pathname, dismiss]);

  return null;
}
