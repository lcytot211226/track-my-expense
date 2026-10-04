"use client";

import { useSyncExternalStore, type ComponentType } from "react";
import {
  getThemePreference,
  setThemePreference,
  subscribeThemePreference,
  type ThemePreference,
} from "@/lib/theme";
import { CheckCircleIcon, ComputerDesktopIcon, MoonIcon, SunIcon } from "./icons";

export const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  description: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { value: "light", label: "淺色", description: "永遠使用淺色", Icon: SunIcon },
  { value: "dark", label: "深色", description: "永遠使用深色", Icon: MoonIcon },
  { value: "system", label: "跟隨系統", description: "依手機 / 電腦的深淺色設定自動切換", Icon: ComputerDesktopIcon },
];

/** 目前的主題偏好;伺服器端渲染時一律當成「跟隨系統」,掛載後才讀 localStorage。 */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribeThemePreference, getThemePreference, () => "system");
}

export default function ThemeSettings() {
  const preference = useThemePreference();

  return (
    <div role="radiogroup" aria-label="外觀主題" className="flex flex-col gap-2">
      {THEME_OPTIONS.map(({ value, label, description, Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setThemePreference(value)}
            className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
              active
                ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
                : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60"
            }`}
          >
            <Icon className="h-5 w-5 shrink-0 text-zinc-600 dark:text-zinc-300" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">{label}</span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">{description}</span>
            </span>
            {active && <CheckCircleIcon className="h-5 w-5 shrink-0 text-zinc-900 dark:text-zinc-50" />}
          </button>
        );
      })}
    </div>
  );
}
