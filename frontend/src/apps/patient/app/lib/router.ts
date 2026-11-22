import { useSyncExternalStore } from "react";

/**
 * Minimal history-API router. Views keep their existing string keys so legacy
 * screens work unchanged, but every view now has a real URL: deep links,
 * back/forward and refresh all behave.
 */
export const ROUTES = {
  welcome: "/welcome",
  login: "/sign-in",
  onboarding: "/join",
  home: "/",
  vault: "/vault",
  records: "/records",
  qr: "/share",
  consent: "/consent",
  profile: "/account",
  "profile-personal": "/account/personal",
  "profile-privacy": "/account/privacy",
  "profile-caregivers": "/account/caregivers",
  "profile-notifications": "/account/notifications",
  "profile-language": "/account/language",
  "profile-accessibility": "/account/accessibility",
  "profile-access-log": "/activity",
  notifications: "/notifications",
  passport: "/passport",
  team: "/care-team",
  "connect-provider": "/care-team/connect",
} as const;

export type View = keyof typeof ROUTES;

/** On the website each app lives under its own path. */
export const BASE = "/patient";
const full = (p: string) => (p === "/" ? BASE : BASE + p);

const BY_PATH = new Map<string, View>(Object.entries(ROUTES).map(([v, p]) => [full(p), v as View]));

export const AUTH_VIEWS: ReadonlySet<View> = new Set<View>(["welcome", "login", "onboarding"]);

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
  // Only the presentation flag survives navigation; per-screen params are replaced.
  if (keep.has("present") && !next.has("present")) next.set("present", keep.get("present")!);
  const qs = next.toString();
  const path = full(ROUTES[view]) + (qs ? `?${qs}` : "");
  if (window.location.pathname + window.location.search === path) return;
  window.history[replace ? "replaceState" : "pushState"](null, "", path);
  listeners.forEach((l) => l());
}

export function useView(): [View, (v: string) => void] {
  const view = useSyncExternalStore(subscribe, current, () => "home" as View);
  return [view, (v: string) => navigate((v in ROUTES ? v : "home") as View)];
}
