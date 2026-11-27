import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, CircleUserRound, Handshake, History, House, LockKeyhole, LogOut, MonitorSmartphone, QrCode, Users, type LucideIcon } from "lucide-react";
import { Logo } from "../brand/Logo";
import { setPrefs, usePrefs, type Theme } from "../lib/preferences";
import type { View } from "../lib/router";

type NavItem = { view: View; label: string; Icon: LucideIcon; match: (v: View) => boolean };

/** Primary destinations — the phone tab bar shows exactly these five; Share is the raised centre action. */
const PRIMARY: NavItem[] = [
  { view: "home", label: "Today", Icon: House, match: (v) => v === "home" || v === "passport" },
  { view: "vault", label: "Vault", Icon: LockKeyhole, match: (v) => v === "vault" },
  { view: "qr", label: "Share", Icon: QrCode, match: (v) => v === "qr" },
  { view: "consent", label: "Consent", Icon: Handshake, match: (v) => v === "consent" },
  { view: "profile", label: "Account", Icon: CircleUserRound, match: (v) => v.startsWith("profile") && v !== "profile-access-log" },
];

/** Secondary destinations — sidebar on wide layouts; reachable from Today/Account on phones. */
const SECONDARY: NavItem[] = [
  { view: "team", label: "Care team", Icon: Users, match: (v) => v === "team" || v === "connect-provider" },
  { view: "profile-access-log", label: "Access log", Icon: History, match: (v) => v === "profile-access-log" },
  { view: "notifications", label: "Notifications", Icon: Bell, match: (v) => v === "notifications" },
];

const TITLES: Partial<Record<View, string>> = {
  home: "Today", passport: "Health passport", vault: "Vault", records: "Records", qr: "Share", consent: "Consent", profile: "Account",
  team: "Care team", "connect-provider": "Connect a provider", "profile-access-log": "Access log", notifications: "Notifications",
  "profile-personal": "Personal details", "profile-privacy": "Privacy", "profile-caregivers": "Caregivers",
  "profile-notifications": "Notification settings", "profile-language": "Language", "profile-accessibility": "Accessibility",
};

/** Route-level code that should be warmed before the user taps (hover, focus or touch start). */
const PREFETCH: Partial<Record<View, () => Promise<unknown>>> = {
  vault: () => import("../vault/VaultView"),
  qr: () => import("../share/ShareView"),
  consent: () => import("../consent/ConsentView"),
  profile: () => import("../account/AccountView"),
  "profile-access-log": () => import("../account/AccessLogView"),
  team: () => import("../network/CareTeamView"),
  notifications: () => import("../network/NotificationsView"),
};
const warm = (v: View) => () => { PREFETCH[v]?.(); };

type Props = {
  view: View;
  go: (v: View) => void;
  pendingConsent: number;
  unread: boolean;
  name?: string;
  clanclastId?: string;
  onSignOut: () => void;
  children: ReactNode;
};

export function AppShell({ view, go, pendingConsent, unread, name, clanclastId, onSignOut, children }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  // Frost the top bar only once content passes under it — no scroll listener.
  useEffect(() => {
    const el = sentinel.current, root = scrollRef.current;
    if (!el || !root) return;
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { root, threshold: 1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [view]);

  const badges: Partial<Record<View, number>> = { consent: pendingConsent };

  return (
    <div className="ambient flex h-full text-ink">
      <Sidebar view={view} go={go} badges={badges} unread={unread} name={name} clanclastId={clanclastId} onSignOut={onSignOut} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header
          className={`absolute inset-x-0 top-0 z-30 transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
            scrolled ? "bar shadow-[0_1px_0_var(--hairline)]" : ""
          }`}
          style={{ paddingTop: "var(--safe-top)" }}
        >
          <div className="mx-auto flex h-[var(--topbar-h)] w-full max-w-[calc(var(--content-max)+64px)] items-center gap-2 px-5 @3xl/app:px-8">
            <span className="@3xl/app:hidden"><Logo layout="horizontal" height={26} priority /></span>
            <h1 className={`hidden text-headline font-semibold transition-opacity duration-200 @3xl/app:block ${scrolled ? "opacity-100" : "opacity-0"}`}>{TITLES[view] ?? ""}</h1>
            <span className="flex-1" />
            <button
              onClick={() => go("notifications")} aria-label={unread ? "Notifications, unread" : "Notifications"}
              className="glass-float relative grid h-10 w-10 place-items-center rounded-full transition-transform duration-150 ease-spring active:scale-90"
            >
              <Bell size={18} strokeWidth={1.9} />
              {unread && <i className="absolute right-[9px] top-[9px] h-2 w-2 rounded-full bg-critical ring-2 ring-[var(--glass-strong)]" />}
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="scroll-area no-scrollbar min-h-0 flex-1">
          <div style={{ height: "calc(var(--safe-top) + var(--topbar-h))" }} aria-hidden="true" />
          <div ref={sentinel} className="h-px" aria-hidden="true" />
          <main
            key={view}
            className="enter mx-auto w-full max-w-[calc(var(--content-max)+64px)] px-5 pb-[calc(var(--safe-bottom)+112px)] pt-2 @3xl/app:px-8 @3xl/app:pb-16 @3xl/app:pt-4"
          >
            {children}
          </main>
        </div>

        <TabBar view={view} go={go} badges={badges} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Floating tab bar (phone) */

const TabBar = memo(function TabBar({ view, go, badges }: { view: View; go: (v: View) => void; badges: Partial<Record<View, number>> }) {
  const idx = PRIMARY.findIndex((i) => i.match(view));
  const onCenter = PRIMARY[idx]?.view === "qr";
  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none absolute inset-x-0 z-30 px-3 @3xl/app:hidden"
      style={{ bottom: "calc(var(--safe-bottom) + 8px)" }}
    >
      <ul className="glass-float pointer-events-auto relative mx-auto grid h-16 max-w-[520px] grid-cols-5 items-center rounded-[var(--radius-pill)] px-1.5">
        {/* Sliding selection — springs between tabs, hidden when the centre action is active */}
        <i
          aria-hidden="true"
          className="absolute bottom-1.5 left-1.5 top-1.5 w-[calc((100%-12px)/5)] rounded-[26px] bg-[var(--surface)] shadow-[0_1px_2px_rgb(7_43_39/0.06),0_4px_12px_-6px_rgb(7_43_39/0.18)] transition-[transform,opacity] duration-500 ease-spring"
          style={{ transform: `translateX(${Math.max(idx, 0) * 100}%)`, opacity: idx < 0 || onCenter ? 0 : 1 }}
        />
        {PRIMARY.map(({ view: target, label, Icon, match }) => {
          const active = match(view);
          const count = badges[target] ?? 0;
          if (target === "qr") {
            return (
              <li key={target} className="grid place-items-center">
                <button
                  onClick={() => go(target)} aria-label="Share — show my code" aria-current={active ? "page" : undefined}
                  className="-mt-7 grid h-[58px] w-[58px] place-items-center rounded-full bg-ink text-[var(--canvas-base)] shadow-[0_0_0_5px_var(--glass-strong),0_14px_24px_-10px_rgb(7_43_39/0.7)] transition-transform duration-150 ease-spring active:scale-90"
                >
                  <Icon size={25} strokeWidth={2} />
                </button>
              </li>
            );
          }
          return (
            <li key={target} className="relative z-10 grid h-full place-items-center">
              <button
                onClick={() => go(target)} aria-current={active ? "page" : undefined}
                onPointerDown={warm(target)} onPointerEnter={warm(target)} onFocus={warm(target)}
                className={`group flex h-full w-full flex-col items-center justify-center gap-[3px] text-micro font-semibold transition-colors duration-200 ${active ? "text-ink" : "text-ink-2"}`}
              >
                <span className="relative transition-transform duration-150 ease-spring group-active:scale-90">
                  <Icon size={22} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-accent" : ""} />
                  {count > 0 && <span className="count absolute -right-2.5 -top-1.5 ring-2 ring-[var(--glass-strong)]" aria-label={`${count} pending`}>{count}</span>}
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
});

/* ---------------------------------------------------------------- Floating sidebar (tablet rail / desktop) */

const Sidebar = memo(function Sidebar({ view, go, badges, unread, name, clanclastId, onSignOut }: {
  view: View; go: (v: View) => void; badges: Partial<Record<View, number>>; unread: boolean; name?: string; clanclastId?: string; onSignOut: () => void;
}) {
  return (
    <div className="hidden shrink-0 p-3 pr-0 @3xl/app:block" style={{ paddingTop: "calc(var(--safe-top) + 12px)" }}>
      <aside
        aria-label="Sidebar"
        className="glass-float flex h-full w-[var(--rail-w)] flex-col rounded-[var(--radius-card)] @5xl/app:w-[var(--sidebar-w)]"
      >
        <div className="flex h-16 items-center justify-center px-5 @5xl/app:justify-start">
          <span className="@5xl/app:hidden"><Logo layout="mark" height={28} priority /></span>
          <span className="hidden @5xl/app:inline-block"><Logo layout="horizontal" height={28} priority /></span>
        </div>

        <nav className="scroll-area no-scrollbar flex-1 px-3 pb-4 pt-2">
          <NavList items={PRIMARY} view={view} go={go} badges={badges} />
          <p className="eyebrow mb-1.5 mt-7 hidden px-3 @5xl/app:block">Activity</p>
          <div className="mx-3 my-4 h-px bg-hairline @5xl/app:hidden" />
          <NavList items={SECONDARY} view={view} go={go} badges={badges} dot={unread ? "notifications" : undefined} />
        </nav>

        <AccountMenu name={name} clanclastId={clanclastId} onSignOut={onSignOut} />
      </aside>
    </div>
  );
});

function NavList({ items, view, go, badges, dot }: { items: NavItem[]; view: View; go: (v: View) => void; badges: Partial<Record<View, number>>; dot?: View }) {
  return (
    <ul className="space-y-1">
      {items.map(({ view: target, label, Icon, match }) => {
        const active = match(view);
        const count = badges[target] ?? 0;
        return (
          <li key={target}>
            <button
              onClick={() => go(target)}
              onPointerEnter={warm(target)} onFocus={warm(target)}
              title={label}
              aria-current={active ? "page" : undefined}
              className={`relative flex h-11 w-full items-center justify-center gap-3 rounded-[14px] px-3 text-subhead font-medium transition-[background-color,color,box-shadow] duration-200 @5xl/app:justify-start ${
                active ? "bg-[var(--surface)] text-ink shadow-[0_1px_2px_rgb(7_43_39/0.06),0_4px_12px_-6px_rgb(7_43_39/0.16)]" : "text-ink-2 hover:bg-[var(--glass)] hover:text-ink"
              }`}
            >
              <Icon size={19} strokeWidth={active ? 2.1 : 1.8} className={`shrink-0 ${active ? "text-accent" : ""}`} />
              <span className="hidden flex-1 text-left @5xl/app:block">{label}</span>
              {count > 0 && <span className="count absolute right-1.5 top-1 @5xl/app:static">{count}</span>}
              {dot === target && <i className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-critical @5xl/app:static" aria-label="unread" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------------------------------------------------------- Account menu */

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "·";
}

const THEMES: { value: Theme; label: string }[] = [
  { value: "system", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function AccountMenu({ name, clanclastId, onSignOut }: { name?: string; clanclastId?: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const prefs = usePrefs();

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div ref={ref} className="relative p-3">
      {open && (
        <div role="menu" className="dialog-enter glass-float absolute bottom-[calc(100%-4px)] left-3 z-40 w-[236px] origin-bottom-left rounded-[18px] p-1.5">
          <p className="eyebrow px-2.5 pb-1.5 pt-2">Appearance</p>
          <div className="mx-1 mb-1 grid grid-cols-3 gap-0.5 rounded-[10px] bg-surface-2 p-0.5" role="radiogroup" aria-label="Appearance">
            {THEMES.map((t) => (
              <button
                key={t.value} role="radio" aria-checked={prefs.theme === t.value} onClick={() => setPrefs({ theme: t.value })}
                className={`h-7 rounded-[8px] text-caption font-semibold transition-colors duration-150 ${prefs.theme === t.value ? "bg-surface text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-ink-2"}`}
              >{t.label}</button>
            ))}
          </div>
          <MenuItem Icon={MonitorSmartphone} onClick={() => { setPrefs({ present: !prefs.present }); setOpen(false); }}>
            {prefs.present ? "Exit presentation mode" : "Presentation mode"}
          </MenuItem>
          <div className="my-1 h-px bg-hairline" />
          <MenuItem Icon={LogOut} onClick={onSignOut} tone="critical">Sign out</MenuItem>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} title={name}
        className="flex w-full items-center justify-center gap-3 rounded-[14px] p-1.5 text-left transition-colors duration-150 hover:bg-[var(--glass)] @5xl/app:justify-start"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-footnote font-semibold text-[var(--canvas-base)]">{initials(name)}</span>
        <span className="hidden min-w-0 flex-1 @5xl/app:block">
          <span className="block truncate text-subhead font-semibold">{name || " "}</span>
          <span className="mono block truncate text-caption text-ink-2">{clanclastId || " "}</span>
        </span>
      </button>
    </div>
  );
}

function MenuItem({ Icon, children, onClick, tone }: { Icon: LucideIcon; children: ReactNode; onClick: () => void; tone?: "critical" }) {
  return (
    <button role="menuitem" onClick={onClick} className={`flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-subhead font-medium hover:bg-[var(--glass)] ${tone === "critical" ? "text-critical" : "text-ink"}`}>
      <Icon size={17} strokeWidth={1.8} />{children}
    </button>
  );
}
