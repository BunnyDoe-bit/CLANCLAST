import { memo, useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, Check, ChevronDown, Clock, Handshake, History, ShieldCheck, X } from "lucide-react";
import { ApiError, patientApi } from "../../lib/api";
import { navigate } from "../lib/router";
import { ago, fmtDate, fmtDateTime, until } from "../lib/format";

/**
 * Consent centre (Canon Rule 1: patients own consent; Patient Rights: transparency, revocation).
 * Every decision is applied optimistically — the card moves the instant it's tapped — and rolled
 * back with an explanation if the server refuses.
 */

export type Duration = "ONCE" | "SEVEN_DAYS" | "UNTIL_REVOKED";
export type ConsentItem = {
  id: string;
  organization: string;
  provider: string;
  scope: string[];
  reason?: string | null;
  status: "PENDING" | "APPROVED" | "DECLINED" | "REVOKED" | "EXPIRED";
  duration?: Duration | null;
  createdAt: string;
  respondedAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
};

const DURATIONS: { v: Duration; label: string; hint: string; ms: number | null }[] = [
  { v: "ONCE", label: "Once", hint: "A one-hour window for this visit", ms: 3_600_000 },
  { v: "SEVEN_DAYS", label: "7 days", hint: "Ends automatically after a week", ms: 7 * 86_400_000 },
  { v: "UNTIL_REVOKED", label: "Until I revoke", hint: "Stays on until you turn it off", ms: null },
];

type Props = {
  items: ConsentItem[];
  setItems: (fn: (prev: ConsentItem[]) => ConsentItem[]) => void;
  defaultDuration?: Duration | null;
  /** Refresh things that depend on consent (notifications, passport) after the server confirms. */
  onSettled: () => void;
};

export default function ConsentView({ items, setItems, defaultDuration, onSettled }: Props) {
  const [error, setError] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const now = Date.now();
  const { pending, active, history } = useMemo(() => {
    const isLive = (c: ConsentItem) => c.status === "APPROVED" && (!c.expiresAt || new Date(c.expiresAt).getTime() > now);
    return {
      pending: items.filter((c) => c.status === "PENDING"),
      active: items.filter(isLive),
      history: items
        .filter((c) => c.status !== "PENDING" && !isLive(c))
        .map((c) => (c.status === "APPROVED" ? { ...c, status: "EXPIRED" as const } : c)),
    };
  }, [items, now]);

  /** Optimistic transition with rollback. */
  async function act(id: string, patch: Partial<ConsentItem>, call: () => Promise<unknown>, failMsg: string) {
    setError("");
    const before = items.find((c) => c.id === id);
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setPendingIds((s) => new Set(s).add(id));
    try {
      await call();
      onSettled();
    } catch (e) {
      if (before) setItems((prev) => prev.map((c) => (c.id === id ? before : c)));
      setError(e instanceof ApiError ? e.message : failMsg);
    } finally {
      setPendingIds((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  const approve = (c: ConsentItem, d: Duration) => {
    const ms = DURATIONS.find((x) => x.v === d)!.ms;
    act(c.id, { status: "APPROVED", duration: d, respondedAt: new Date().toISOString(), expiresAt: ms ? new Date(Date.now() + ms).toISOString() : null },
      () => patientApi.approveConsent(c.id, d), "Couldn't save your approval. Nothing was shared.");
  };
  const decline = (c: ConsentItem) =>
    act(c.id, { status: "DECLINED", respondedAt: new Date().toISOString() }, () => patientApi.declineConsent(c.id), "Couldn't send your decision. Try again.");
  const revoke = (c: ConsentItem) =>
    act(c.id, { status: "REVOKED", revokedAt: new Date().toISOString() }, () => patientApi.revokeConsent(c.id), "Couldn't revoke access. It is still active. Try again.");

  return (
    <>
      <div className="mb-5">
        <h1 className="large-title">Consent</h1>
        <p className="mt-1 text-subhead text-ink-2">Nothing is shared without your approval, and you can change your mind.</p>
      </div>

      {error && (
        <div role="alert" className="enter mb-4 flex items-start gap-2.5 rounded-[16px] bg-critical-tint px-3.5 py-3 text-footnote text-critical">
          <X size={16} className="mt-px shrink-0" strokeWidth={2.4} />
          <p className="flex-1">{error}</p>
          <button onClick={() => setError("")} className="font-semibold">Dismiss</button>
        </div>
      )}

      <Section title="Needs your decision" count={pending.length}>
        {pending.length === 0 ? (
          <Empty Icon={Handshake} text="No requests waiting. When a provider asks to see your information, it appears here." />
        ) : (
          <div className="grid gap-3">
            {pending.map((c) => (
              <RequestCard key={c.id} c={c} initial={defaultDuration ?? "SEVEN_DAYS"} onApprove={(d) => approve(c, d)} onDecline={() => decline(c)} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Active access" count={active.length}>
        {active.length === 0 ? (
          <Empty Icon={ShieldCheck} text="No one currently has access to your information." />
        ) : (
          <div className="list-group">
            {active.map((c) => <ActiveRow key={c.id} c={c} saving={pendingIds.has(c.id)} onRevoke={() => revoke(c)} />)}
          </div>
        )}
      </Section>

      <HistorySection items={history} />

      <button onClick={() => navigate("profile-access-log")} className="glass press mt-6 flex w-full items-center gap-3.5 p-4 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-accent-tint text-accent"><History size={19} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-callout font-semibold">Who accessed my information</span>
          <span className="block text-footnote text-ink-2">Every view is logged with who, when and why</span>
        </span>
        <span className="chev"><ArrowRight size={15} strokeWidth={2.2} /></span>
      </button>
    </>
  );
}

/* ------------------------------------------------------------------ pieces */

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="mt-6 first-of-type:mt-0">
      <h2 className="mb-2.5 flex items-center gap-2 px-1 text-footnote font-semibold uppercase tracking-[0.06em] text-ink-2">
        {title}
        {!!count && <span className="tnum rounded-full bg-surface-2 px-2 py-0.5 text-caption tracking-normal text-ink">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

function Empty({ Icon, text }: { Icon: typeof Handshake; text: string }) {
  return (
    <div className="glass flex items-center gap-3.5 p-4 text-footnote text-ink-2">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-surface-2 text-ink-3"><Icon size={19} /></span>
      {text}
    </div>
  );
}

function OrgTile({ size = 44 }: { size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-[14px] bg-accent-tint text-accent" style={{ width: size, height: size }}>
      <Building2 size={size * 0.45} strokeWidth={1.8} />
    </span>
  );
}

const RequestCard = memo(function RequestCard({ c, initial, onApprove, onDecline }: { c: ConsentItem; initial: Duration; onApprove: (d: Duration) => void; onDecline: () => void }) {
  const [d, setD] = useState<Duration>(initial);
  const idx = DURATIONS.findIndex((x) => x.v === d);
  return (
    <article className="glass enter relative overflow-hidden p-4">
      <i aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-warning" />
      <div className="flex items-start gap-3">
        <OrgTile />
        <div className="min-w-0 flex-1">
          <p className="text-headline font-semibold leading-tight">{c.organization}</p>
          <p className="mt-0.5 text-footnote text-ink-2">{c.provider}{c.reason ? ` · ${c.reason}` : ""}</p>
        </div>
        <span className="tnum shrink-0 text-caption text-ink-2">{ago(c.createdAt)}</span>
      </div>

      <p className="eyebrow mt-4">Wants to see</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {c.scope.map((s) => <li key={s} className="rounded-full bg-surface-2 px-3 py-1 text-footnote font-medium">{s}</li>)}
      </ul>

      <p className="eyebrow mt-4">For how long</p>
      <div role="radiogroup" aria-label="Access duration" className="relative mt-2 grid grid-cols-3 rounded-[14px] bg-surface-2 p-1">
        <i aria-hidden="true" className="absolute bottom-1 left-1 top-1 w-[calc((100%-8px)/3)] rounded-[10px] bg-[var(--surface)] shadow-[0_1px_2px_rgb(7_43_39/0.08),0_4px_10px_-6px_rgb(7_43_39/0.2)] transition-transform duration-500 ease-spring" style={{ transform: `translateX(${idx * 100}%)` }} />
        {DURATIONS.map((o) => (
          <button key={o.v} role="radio" aria-checked={d === o.v} onClick={() => setD(o.v)} className={`relative z-10 h-9 rounded-[10px] text-footnote font-semibold transition-colors duration-200 ${d === o.v ? "text-ink" : "text-ink-2"}`}>
            {o.label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 px-1 text-caption text-ink-2">{DURATIONS[idx].hint}</p>

      <div className="mt-4 grid grid-cols-[1fr_1.4fr] gap-2">
        <button onClick={onDecline} className="btn btn-quiet btn-lg">Decline</button>
        <button onClick={() => onApprove(d)} className="btn btn-primary btn-lg"><Check size={18} strokeWidth={2.6} /> Allow</button>
      </div>
    </article>
  );
});

function ActiveRow({ c, saving, onRevoke }: { c: ConsentItem; saving: boolean; onRevoke: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 60_000); return () => clearInterval(t); }, []);

  // Remaining-time bar for timed grants.
  const total = c.expiresAt && c.respondedAt ? new Date(c.expiresAt).getTime() - new Date(c.respondedAt).getTime() : 0;
  const left = c.expiresAt ? new Date(c.expiresAt).getTime() - Date.now() : 0;
  const pct = total > 0 ? Math.max(0, Math.min(100, (left / total) * 100)) : 100;

  return (
    <div className="enter px-4 py-3.5">
      <div className="flex items-start gap-3">
        <OrgTile size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-callout font-semibold">{c.organization}</p>
          <p className="text-footnote text-ink-2">{c.scope.join(", ")}</p>
          <p className="tnum mt-1 flex items-center gap-1.5 text-caption text-ink-2">
            <Clock size={12} strokeWidth={2.2} />
            {saving ? "Saving…" : c.expiresAt ? `Ends ${until(c.expiresAt)} · ${fmtDateTime(c.expiresAt)}` : "Until you revoke"}
          </p>
        </div>
        {!confirm && <button onClick={() => setConfirm(true)} disabled={saving} className="btn btn-destructive min-h-9 shrink-0 px-3 text-footnote">Revoke</button>}
      </div>
      {c.expiresAt && (
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
          <i className="block h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
        </div>
      )}
      {confirm && (
        <div className="enter mt-3 rounded-[14px] bg-critical-tint p-3">
          <p className="text-footnote text-critical">Stop {c.organization} from seeing your information? Anything they already viewed stays in their records.</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button onClick={() => setConfirm(false)} className="btn btn-quiet min-h-10">Keep access</button>
            <button onClick={() => { setConfirm(false); onRevoke(); }} className="btn min-h-10 bg-critical text-white">Revoke</button>
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS: Record<string, { label: string; tone: string }> = {
  DECLINED: { label: "Declined", tone: "bg-surface-2 text-ink-2" },
  REVOKED: { label: "Revoked", tone: "bg-critical-tint text-critical" },
  EXPIRED: { label: "Expired", tone: "bg-warning-tint text-warning" },
};

function HistorySection({ items }: { items: ConsentItem[] }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  const shown = open ? items : items.slice(0, 3);
  return (
    <Section title="History" count={items.length}>
      <div className="list-group">
        {shown.map((c) => {
          const s = STATUS[c.status] ?? STATUS.EXPIRED;
          return (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-callout font-medium">{c.organization}</p>
                <p className="truncate text-footnote text-ink-2">{c.scope.join(", ")}</p>
              </div>
              <div className="shrink-0 text-right">
                <span className={`badge ${s.tone}`}>{s.label}</span>
                <p className="tnum mt-1 text-caption text-ink-2">{fmtDate(c.status === "REVOKED" ? c.revokedAt ?? c.respondedAt ?? c.createdAt : c.status === "EXPIRED" ? c.expiresAt ?? c.createdAt : c.respondedAt ?? c.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>
      {items.length > 3 && (
        <button onClick={() => setOpen((o) => !o)} className="btn btn-plain mx-auto mt-2 flex text-footnote">
          {open ? "Show less" : `Show all ${items.length}`} <ChevronDown size={15} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </button>
      )}
    </Section>
  );
}
