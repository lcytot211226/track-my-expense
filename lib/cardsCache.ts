import type { CardDTO } from "@/components/CardForm";

/**
 * 快速記帳用的信用卡清單快取(localStorage)。打開快速記帳時先用這份顯示表單,
 * /overview 抓回最新的卡片後再覆蓋並更新快取。換帳號(登入 / 登出 / 刪除帳號)時要清掉,
 * 避免顯示上一個帳號的卡片。
 */
const CARDS_CACHE_KEY = "cards-cache";

export function readCachedCards(): CardDTO[] | null {
  try {
    const raw = window.localStorage.getItem(CARDS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCachedCards(cards: CardDTO[]) {
  try {
    const next = JSON.stringify(cards);
    if (window.localStorage.getItem(CARDS_CACHE_KEY) !== next) {
      window.localStorage.setItem(CARDS_CACHE_KEY, next);
    }
  } catch {}
}

export function clearCachedCards() {
  try {
    window.localStorage.removeItem(CARDS_CACHE_KEY);
  } catch {}
}
