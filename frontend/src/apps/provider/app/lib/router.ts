import { useSyncExternalStore } from "react";

/**
 * Minimal history-API router: every screen has a real URL, so deep links,
 * back/forward and refresh behave, and a front-desk tablet can be bookmarked
 * straight to Check-in.
 */
export const ROUTES = {
  login: "/sign-in",
  join: "/join",
  home: "/",
  checkin: "/check-in",
  register: "/check-in/register",
  patients: "/patients",
  patient: "/patients/view",
  consent: "/consent",
  referrals: "/referrals",
  summaries: "/summaries",
  "summary-verify": "/summaries/verify",
  connect: "/connect",
  activity: "/activity",
  settings: "/settings",
} as const;

export type View = keyof typeof ROUTES;

/** On the website each app lives under its own path. */
export const BASE = "/provider";
const full = (p: string) => (p === "/" ? BASE : BASE + p);

const BY_PATH = new Map<string, View>(Object.entries(ROUTES).map(([v, p]) => [full(p), v as View]));

export const AUTH_VIEWS: ReadonlySet<View> = new Set<View>(["login", "join"]);

function current(): View {
  const path = window.location.pathname.replace(/\/+$/, "") || BASE;
  return BY_PATH.get(path) ?? "home";
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("popstate", cb);
  return () => { listeners.delete(cb); window.removeEventListener("popstate", cb); };
}

export function navigate(view: View, { replace = false, search }: { replace?: boolean; search?: string } = {}) {
  const keep = new URLSearchParams(window.location.search);
  const next = new URLSearchParams(search ?? "");
  if (keep.has("present") && !next.has("present")) next.set("present", keep.get("present")!);
  const qs = next.toString();
  const path = full(ROUTES[view]) + (qs ? `?${qs}` : "");
  if (window.location.pathname + window.location.search === path) return;
  window.history[replace ? "replaceState" : "pushState"](null, "", path);
  listeners.forEach((l) => l());
}

export function useView(): View {
  return useSyncExternalStore(subscribe, current, () => "home" as View);
}

/** Reads one query parameter and re-renders when the URL changes. */
export function useParam(name: string): string | null {
  return useSyncExternalStore(subscribe, () => new URLSearchParams(window.location.search).get(name), () => null);
}
