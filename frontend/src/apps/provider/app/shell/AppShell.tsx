import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity, ArrowLeftRight, Ellipsis, FileSignature, Handshake, House, LogOut,
  ScanLine, Search, Send, Settings, Users, type LucideIcon,
} from "lucide-react";
import { Logo } from "../brand/Logo";
import { setPrefs, usePrefs, type Theme } from "../lib/preferences";
import type { View } from "../lib/router";
import { Sheet } from "../ui/Sheet";
import { CommandPalette } from "./CommandPalette";

export type NavItem = { view: View; label: string; Icon: LucideIcon; match: (v: View) => boolean; hint?: string };

/**
 * Information architecture, in the order work happens:
 * front desk → requests that need the patient → trust artefacts → the network
 * (identity resolution and interoperability) → the audit trail.
 */
export const NAV: { group?: string; items: NavItem[] }[] = [
  { items: [{ view: "home", label: "Today", Icon: House, match: (v) => v === "home" }] },
  {
    group: "Front desk",
    items: [
      { view: "checkin", label: "Check-in", Icon: ScanLine, match: (v) => v === "checkin" || v === "register", hint: "Find, verify or register a patient" },
      { view: "patients", label: "Patients", Icon: Users, match: (v) => v === "patients" || v === "patient", hint: "Patients in your care" },
    ],
  },
  {
    group: "Requests",
    items: [
      { view: "consent", label: "Consent", Icon: Handshake, match: (v) => v === "consent", hint: "Access you asked patients for" },
      { view: "referrals", label: "Referrals", Icon: Send, match: (v) => v === "referrals", hint: "Referrals in and out" },
    ],
  },
  {
    group: "Trust",
    items: [
      { view: "summaries", label: "Summaries", Icon: FileSignature, match: (v) => v === "summaries" || v === "summary-verify", hint: "Issue, verify and revoke signed summaries" },
    ],
  },
  {
    group: "Network",
    items: [
      { view: "connect", label: "Connect", Icon: ArrowLeftRight, match: (v) => v === "connect", hint: "Connected institutions and system health" },
    ],
  },
  {
    group: "Audit",
    items: [{ view: "activity", label: "Activity", Icon: Activity, match: (v) => v === "activity", hint: "Everything your team did, in order" }],
  },
];

export const ALL_NAV = NAV.flatMap((g) => g.items);

export const TITLES: Record<View, string> = {
  login: "Sign in", join: "Create account", home: "Today", checkin: "Check-in", register: "Register a patient",
  patients: "Patients", patient: "Patient", consent: "Consent", referrals: "Referrals", summaries: "Summaries",
  "summary-verify": "Verify a summary", connect: "Connect",
  activity: "Activity", settings: "Settings",
};

/** Phone tab bar: four destinations plus More; Check-in is the raised centre action. */
const TABS: NavItem[] = [
  ALL_NAV.find((n) => n.view === "home")!,
  ALL_NAV.find((n) => n.view === "patients")!,
  ALL_NAV.find((n) => n.view === "checkin")!,
  ALL_NAV.find((n) => n.view === "summaries")!,
];

/** Route-level code warmed on hover, focus or touch so screens open instantly. */
export const PREFETCH: Partial<Record<View, () => Promise<unknown>>> = {
  checkin: () => import("../checkin/CheckInView"),
  register: () => import("../checkin/RegisterView"),
  summaries: () => import("../summaries/SummariesView"),
  connect: () => import("../connect/ConnectView"),
  patients: () => import("../patients/PatientsView"),
  consent: () => import("../requests/ConsentView"),
  referrals: () => import("../requests/ReferralsView"),
  activity: () => import("../activity/ActivityView"),
};
const warm = (v: View) => () => { PREFETCH[v]?.(); };

type Props = {
  view: View;
  go: (v: View, search?: string) => void;
  badges: Partial<Record<View, number>>;
  name?: string;
  role?: string;
  org?: { name: string; status: string };
  onSignOut: () => void;
  children: ReactNode;
};

export function AppShell({ view, go, badges, name, role, org, onSignOut, children }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [palette, setPalette] = useState(false);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const el = sentinel.current, root = scrollRef.current;
    if (!el || !root) return;
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { root, threshold: 1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [view]);

  // ⌘K / Ctrl-K or "/" opens search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea, select, [contenteditable]");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) { e.preventDefault(); setPalette(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="ambient flex h-full text-ink">
      <Sidebar view={view} go={go} badges={badges} name={name} role={role} org={org} onSignOut={onSignOut} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header
          className={`absolute inset-x-0 top-0 z-30 transition-[background-color,box-shadow,backdrop-filter] duration-300 ${scrolled ? "bar shadow-[0_1px_0_var(--hairline)]" : ""}`}
          style={{ paddingTop: "var(--safe-top)" }}
        >
          <div className="mx-auto flex h-[var(--topbar-h)] w-full max-w-[calc(var(--content-max)+64px)] items-center gap-2 px-5 @3xl/app:px-8">
            <span className="@3xl/app:hidden"><Logo layout="horizontal" height={24} priority /></span>
            <h1 className={`hidden text-headline font-semibold transition-opacity duration-200 @3xl/app:block ${scrolled ? "opacity-100" : "opacity-0"}`}>{TITLES[view]}</h1>
            <span className="flex-1" />
            <button
              onClick={() => setPalette(true)} aria-label="Search patients and screens"
              className="glass-float press flex h-10 items-center gap-2 rounded-full px-3 text-subhead text-ink-2 @3xl/app:w-[260px] @3xl/app:px-3.5"
            >
              <Search size={17} strokeWidth={1.9} className="shrink-0" />
              <span className="hidden flex-1 text-left @3xl/app:block">Search patients</span>
              <kbd className="hidden rounded-[6px] bg-surface-2 px-1.5 py-0.5 font-sans text-caption text-ink-2 @3xl/app:block">⌘K</kbd>
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

        <TabBar view={view} go={go} badges={badges} onMore={() => setMore(true)} />
      </div>

      {palette && <CommandPalette close={() => setPalette(false)} go={go} />}
      {more && <MoreSheet view={view} go={(v) => { setMore(false); go(v); }} badges={badges} close={() => setMore(false)} onSignOut={onSignOut} />}
    </div>
  );
}

/* ---------------------------------------------------------------- Floating tab bar (phone) */

const TabBar = memo(function TabBar({ view, go, badges, onMore }: { view: View; go: (v: View) => void; badges: Partial<Record<View, number>>; onMore: () => void }) {
  const slots = TABS;
  const idx = slots.findIndex((i) => i.match(view));
  const moreActive = idx < 0;
  const pos = moreActive ? 4 : idx;
  const onCenter = slots[idx]?.view === "checkin";
  const moreCount = ALL_NAV.filter((n) => !TABS.includes(n)).reduce((s, n) => s + (badges[n.view] ?? 0), 0);
  return (
    <nav aria-label="Primary" className="pointer-events-none absolute inset-x-0 z-30 px-3 @3xl/app:hidden" style={{ bottom: "calc(var(--safe-bottom) + 8px)" }}>
      <ul className="glass-float pointer-events-auto relative mx-auto grid h-16 max-w-[520px] grid-cols-5 items-center rounded-[var(--radius-pill)] px-1.5">
        <i
          aria-hidden="true"
          className="absolute bottom-1.5 left-1.5 top-1.5 w-[calc((100%-12px)/5)] rounded-[26px] bg-[var(--surface)] shadow-[0_1px_2px_rgb(7_43_39/0.06),0_4px_12px_-6px_rgb(7_43_39/0.18)] transition-[transform,opacity] duration-500 ease-spring"
          style={{ transform: `translateX(${pos * 100}%)`, opacity: onCenter ? 0 : 1 }}
        />
        {slots.map((item) => {
          const { view: target, label, Icon, match } = item;
          const active = match(view);
          const count = badges[target] ?? 0;
          if (target === "checkin") {
            return (
              <li key={target} className="grid place-items-center">
                <button
                  onClick={() => go(target)} aria-label="Check in a patient" aria-current={active ? "page" : undefined}
                  className="-mt-7 grid h-[58px] w-[58px] place-items-center rounded-full bg-ink text-[var(--canvas-base)] shadow-[0_0_0_5px_var(--glass-strong),0_14px_24px_-10px_rgb(7_43_39/0.7)] transition-transform duration-150 ease-spring active:scale-90"
                >
                  <Icon size={25} strokeWidth={2} />
                </button>
              </li>
            );
          }
          return (
            <li key={target} className="relative z-10 grid h-full place-items-center">
              <TabButton label={label} Icon={Icon} active={active} count={count} onClick={() => go(target)} onWarm={warm(target)} />
            </li>
          );
        })}
        <li className="relative z-10 grid h-full place-items-center">
          <TabButton label="More" Icon={Ellipsis} active={moreActive} count={moreCount} onClick={onMore} />
        </li>
      </ul>
    </nav>
  );
});

function TabButton({ label, Icon, active, count, onClick, onWarm }: { label: string; Icon: LucideIcon; active: boolean; count: number; onClick: () => void; onWarm?: () => void }) {
  return (
    <button
      onClick={onClick} aria-current={active ? "page" : undefined}
      onPointerDown={onWarm} onPointerEnter={onWarm} onFocus={onWarm}
      className={`group flex h-full w-full flex-col items-center justify-center gap-[3px] text-micro font-semibold transition-colors duration-200 ${active ? "text-ink" : "text-ink-2"}`}
    >
      <span className="relative transition-transform duration-150 ease-spring group-active:scale-90">
        <Icon size={22} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-accent" : ""} />
        {count > 0 && <span className="count absolute -right-2.5 -top-1.5 ring-2 ring-[var(--glass-strong)]" aria-label={`${count} pending`}>{count}</span>}
      </span>
      {label}
    </button>
  );
}

function MoreSheet({ view, go, badges, close, onSignOut }: { view: View; go: (v: View) => void; badges: Partial<Record<View, number>>; close: () => void; onSignOut: () => void }) {
  const rest = NAV.map((g) => ({ ...g, items: g.items.filter((n) => !TABS.includes(n)) })).filter((g) => g.items.length);
  return (
    <Sheet title="More" close={close}>
      {rest.map((g) => (
        <section key={g.group} className="mb-4">
          <p className="eyebrow mb-1.5 px-1">{g.group}</p>
          <ul className="list-group">
            {g.items.map((n) => (
              <li key={n.view}>
                <button onClick={() => go(n.view)} aria-current={n.match(view) ? "page" : undefined} className="list-row">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-accent-tint text-accent"><n.Icon size={18} /></span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-callout font-semibold">{n.label}</span>
                    {n.hint && <span className="block truncate text-footnote text-ink-2">{n.hint}</span>}
                  </span>
                  {(badges[n.view] ?? 0) > 0 && <span className="count">{badges[n.view]}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <ul className="list-group">
        <li><button onClick={() => go("settings")} className="list-row"><span className="grid h-9 w-9 place-items-center rounded-[12px] bg-surface-2 text-ink-2"><Settings size={18} /></span><span className="flex-1 text-left text-callout font-semibold">Settings</span></button></li>
        <li><button onClick={onSignOut} className="list-row text-critical"><span className="grid h-9 w-9 place-items-center rounded-[12px] bg-critical-tint"><LogOut size={18} /></span><span className="flex-1 text-left text-callout font-semibold">Sign out</span></button></li>
      </ul>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- Floating sidebar (tablet rail / desktop) */

const Sidebar = memo(function Sidebar({ view, go, badges, name, role, org, onSignOut }: {
  view: View; go: (v: View) => void; badges: Partial<Record<View, number>>; name?: string; role?: string; org?: { name: string; status: string }; onSignOut: () => void;
}) {
  return (
    <div className="hidden shrink-0 p-3 pr-0 @3xl/app:block" style={{ paddingTop: "calc(var(--safe-top) + 12px)" }}>
      <aside aria-label="Sidebar" className="glass-float flex h-full w-[var(--rail-w)] flex-col rounded-[var(--radius-card)] @5xl/app:w-[var(--sidebar-w)]">
        <div className="flex h-16 items-center justify-center gap-2 px-5 @5xl/app:justify-start">
          <span className="@5xl/app:hidden"><Logo layout="mark" height={28} priority /></span>
          <span className="hidden @5xl/app:inline-block"><Logo layout="horizontal" height={26} priority /></span>
          <span className="hidden rounded-[6px] bg-accent-tint px-1.5 py-0.5 text-micro font-semibold uppercase tracking-[0.08em] text-accent @5xl/app:inline-block">Provider</span>
        </div>

        {org && (
          <div className="mx-3 mb-1 hidden items-center gap-2 rounded-[12px] px-3 py-2 @5xl/app:flex">
            <i className={`h-2 w-2 shrink-0 rounded-full ${org.status === "CONNECTED" ? "bg-positive" : "bg-warning"}`} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-footnote font-medium text-ink-2" title={org.name}>{org.name}</span>
          </div>
        )}

        <nav className="scroll-area no-scrollbar flex-1 px-3 pb-4 pt-1">
          {NAV.map((g, i) => (
            <div key={g.group ?? i}>
              {g.group && <p className="eyebrow mb-1.5 mt-5 hidden px-3 @5xl/app:block">{g.group}</p>}
              {g.group && <div className="mx-3 my-3 h-px bg-hairline @5xl/app:hidden" />}
              <NavList items={g.items} view={view} go={go} badges={badges} />
            </div>
          ))}
        </nav>

        <AccountMenu name={name} role={role} go={go} onSignOut={onSignOut} />
      </aside>
    </div>
  );
});

function NavList({ items, view, go, badges }: { items: NavItem[]; view: View; go: (v: View) => void; badges: Partial<Record<View, number>> }) {
  return (
    <ul className="space-y-0.5">
      {items.map(({ view: target, label, Icon, match }) => {
        const active = match(view);
        const count = badges[target] ?? 0;
        return (
          <li key={target}>
            <button
              onClick={() => go(target)} onPointerEnter={warm(target)} onFocus={warm(target)}
              title={label} aria-current={active ? "page" : undefined}
              className={`relative flex h-10 w-full items-center justify-center gap-3 rounded-[12px] px-3 text-subhead font-medium transition-[background-color,color,box-shadow] duration-200 @5xl/app:justify-start ${
                active ? "bg-[var(--surface)] text-ink shadow-[0_1px_2px_rgb(7_43_39/0.06),0_4px_12px_-6px_rgb(7_43_39/0.16)]" : "text-ink-2 hover:bg-[var(--glass)] hover:text-ink"
              }`}
            >
              <Icon size={19} strokeWidth={active ? 2.1 : 1.8} className={`shrink-0 ${active ? "text-accent" : ""}`} />
              <span className="hidden flex-1 text-left @5xl/app:block">{label}</span>
              {count > 0 && <span className="count absolute right-1.5 top-0.5 @5xl/app:static">{count}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------------------------------------------------------- Account menu */

function initials(name = "") {
  return name.replace(/^Dr\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "·";
}

const THEMES: { value: Theme; label: string }[] = [
  { value: "system", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function AccountMenu({ name, role, go, onSignOut }: { name?: string; role?: string; go: (v: View) => void; onSignOut: () => void }) {
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
          <MenuItem Icon={Settings} onClick={() => { setOpen(false); go("settings"); }}>Settings</MenuItem>
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
          <span className="block truncate text-subhead font-semibold">{name || " "}</span>
          <span className="block truncate text-caption text-ink-2">{role || " "}</span>
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
