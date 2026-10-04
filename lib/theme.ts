/**
 * 主題偏好:淺色 / 深色 / 跟隨系統。存在 localStorage 的 "theme"(跟隨系統 = 不存這個 key),
 * 實際套用是切換 <html> 的 .dark class。頁面初次載入的套用與「跟隨系統時,系統主題改變就即時切換」
 * 寫在 app/layout.tsx 的 THEME_INIT_SCRIPT,這裡負責使用者手動變更。
 */
export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme";
const THEME_CHANGE_EVENT = "themechange";

export function getThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

export function setThemePreference(preference: ThemePreference) {
  try {
    if (preference === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {}
  const isDark =
    preference === "dark" ||
    (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/** 給 useSyncExternalStore 用:偏好被本頁其他元件或其他分頁改掉時通知重新讀取。 */
export function subscribeThemePreference(callback: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
