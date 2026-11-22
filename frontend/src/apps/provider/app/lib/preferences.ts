import { useSyncExternalStore } from "react";

/** Per-device display preferences. Storage can be unavailable (private mode), so every access is guarded. */
export type Theme = "system" | "light" | "dark";

type Prefs = { theme: Theme; present: boolean };

const KEY = "cc-prefs";

function read(): Prefs {
  let stored: Partial<Prefs> = {};
  try { stored = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { /* ignore */ }
  const q = new URLSearchParams(window.location.search).get("present");
  return {
    theme: stored.theme === "light" || stored.theme === "dark" ? stored.theme : "system",
    present: q === null ? !!stored.present : q !== "0",
  };
}

let prefs = read();
const listeners = new Set<() => void>();

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}
applyTheme(prefs.theme);

export function setPrefs(patch: Partial<Prefs>) {
  prefs = { ...prefs, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
  if (patch.theme) applyTheme(patch.theme);
  if ("present" in patch) {
    const url = new URL(window.location.href);
    url.searchParams.delete("present");
    window.history.replaceState(null, "", url);
  }
  listeners.forEach((l) => l());
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => prefs,
  );
}
