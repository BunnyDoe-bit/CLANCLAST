import { useEffect, useMemo, useState } from "react";
import { Building2, Check, ChevronDown, ChevronLeft, Link2, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { verifyOnDevice, type ChainFields, type Integrity } from "./auditChain";
import { openSupport, supportEnabled } from "../support/Support";
import { patientApi } from "../../lib/api";
import { navigate } from "../lib/router";
import { ago, fmtDateTime } from "../lib/format";
import { Segmented } from "../ui/controls";

/**
 * Access log — Patient Rights "Transparency": who accessed your information, when and why.
 * Emergency (break-glass) access is highlighted and can be marked as reviewed.
 */
type Entry = { id: string; organization: string; provider: string; action: string; isEmergency: boolean; reason: string | null; acknowledgedByPatient: boolean; createdAt: string; chain: ChainFields | null };
type Filter = "all" | "emergency" | "review";

const monthFmt = new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric" });

export default function AccessLogView() {
  const [list, setList] = useState<Entry[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState("");
  const [integrity, setIntegrity] = useState<Integrity | null>(null);
  useEffect(() => {
    patientApi.accessLog()
      .then((l: Entry[]) => { setList(l); verifyOnDevice(l).then(setIntegrity); })
      .catch(() => { setList([]); setError("Couldn't load the access log. Check your connection."); });
  }, []);

  const toReview = list?.filter((e) => e.isEmergency && !e.acknowledgedByPatient).length ?? 0;
  const emergencies = list?.filter((e) => e.isEmergency).length ?? 0;

  const groups = useMemo(() => {
    const rows = (list ?? []).filter((e) => filter === "all" || (filter === "emergency" ? e.isEmergency : e.isEmergency && !e.acknowledgedByPatient));
    const map = new Map<string, Entry[]>();
    rows.forEach((e) => { const k = monthFmt.format(new Date(e.createdAt)); map.set(k, [...(map.get(k) ?? []), e]); });
    return [...map.entries()];
  }, [list, filter]);

  async function acknowledge(id: string) {
    setList((l) => l?.map((e) => (e.id === id ? { ...e, acknowledgedByPatient: true } : e)) ?? l);
    try { await patientApi.acknowledgeAccess(id); }
    catch { setList((l) => l?.map((e) => (e.id === id ? { ...e, acknowledgedByPatient: false } : e)) ?? l); setError("Couldn't save that. Try again."); }
  }

  return (
    <>
      <div className="mb-5">
        <button onClick={() => navigate("profile")} className="btn btn-plain -ml-2 mb-1 min-h-9 px-2 text-callout @3xl/app:hidden"><ChevronLeft size={20} /> Account</button>
        <h1 className="large-title">Access log</h1>
        <p className="mt-1 text-subhead text-ink-2">Every time someone views your information through CLANCLAST, it's recorded here.</p>
      </div>

      <IntegrityCard integrity={integrity} loading={list === null} />

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Count n={list?.length} label="accesses" />
        <Count n={list ? emergencies : undefined} label="emergency" tone={emergencies ? "critical" : undefined} />
        <Count n={list ? toReview : undefined} label="to review" tone={toReview ? "warning" : undefined} />
      </div>

      <div className="mt-4">
        <Segmented<Filter> label="Filter" value={filter} onChange={setFilter}
          options={[{ v: "all", label: "All" }, { v: "emergency", label: "Emergency" }, { v: "review", label: "To review" }]} />
      </div>

      {error && <p role="alert" className="mt-3 rounded-[14px] bg-critical-tint px-3.5 py-2.5 text-footnote text-critical">{error}</p>}

      {list === null ? (
        <div className="list-group mt-5">{[0, 1, 2].map((i) => <div key={i} className="flex gap-3 px-4 py-3.5"><span className="skeleton h-10 w-10 !rounded-[12px]" /><span className="flex-1"><span className="skeleton block h-4 w-44" /><span className="skeleton mt-1.5 block h-3 w-60" /></span></div>)}</div>
      ) : groups.length === 0 ? (
        <div className="glass mt-5 p-5 text-center text-footnote text-ink-2">{filter === "all" ? "No one has accessed your information yet." : "Nothing here."}</div>
      ) : groups.map(([month, rows]) => (
        <section key={month} className="mt-6">
          <h2 className="mb-2 px-1 text-footnote font-semibold uppercase tracking-[0.06em] text-ink-2">{month}</h2>
          <ol className="list-group">
            {rows.map((e) => (
              <li key={e.id} className={`px-4 py-3.5 ${e.isEmergency && !e.acknowledgedByPatient ? "bg-critical-tint/40" : ""}`}>
                <div className="flex items-start gap-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${e.isEmergency ? "bg-critical-tint text-critical" : "bg-surface-2 text-ink-2"}`}>
                    {e.isEmergency ? <ShieldAlert size={18} /> : <Building2 size={18} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-callout font-semibold">{e.organization}{e.chain && <span className="mono ml-2 text-caption font-normal text-ink-3">#{e.chain.seq}</span>}</p>
                      <time dateTime={e.createdAt} title={fmtDateTime(e.createdAt)} className="tnum shrink-0 text-caption text-ink-2">{ago(e.createdAt)}</time>
                    </div>
                    <p className="text-footnote text-ink-2">{e.provider} · {e.action}</p>
                    <p className="tnum text-caption text-ink-3">{fmtDateTime(e.createdAt)}</p>
                    {e.isEmergency && (
                      <div className="mt-2.5 rounded-[14px] bg-critical-tint p-3 text-footnote text-critical">
                        <p><b className="font-semibold">Emergency access.</b> {e.reason ? `Reason given: ${e.reason}` : "No reason was recorded."}</p>
                        {e.acknowledgedByPatient ? (
                          <p className="mt-1.5 flex items-center gap-1.5 font-semibold"><Check size={14} strokeWidth={2.6} /> You've reviewed this</p>
                        ) : (
                          <button onClick={() => acknowledge(e.id)} className="btn mt-2 min-h-9 bg-critical px-3 text-footnote text-white">Mark as reviewed</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </>
  );
}

function Count({ n, label, tone }: { n?: number; label: string; tone?: "critical" | "warning" }) {
  return (
    <div className="glass p-3.5">
      {n === undefined ? <span className="skeleton block h-7 w-8" /> : <p className={`tnum text-[1.75rem] font-bold leading-7 tracking-[-0.03em] ${tone === "critical" ? "text-critical" : tone === "warning" ? "text-warning" : ""}`}>{n}</p>}
      <p className="mt-1 text-footnote text-ink-2">{label}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ integrity */

function IntegrityCard({ integrity, loading }: { integrity: Integrity | null; loading: boolean }) {
  const [open, setOpen] = useState(false);
  if (loading || !integrity) {
    return (
      <div className="glass flex items-center gap-3 p-4" aria-busy="true">
        <span className="skeleton h-10 w-10 !rounded-[12px]" />
        <span className="flex-1"><span className="block text-callout font-medium text-ink-2">Checking the log on this device…</span><span className="skeleton mt-1.5 block h-3 w-48" /></span>
      </div>
    );
  }
  if (integrity.state === "empty") return null;

  const bad = integrity.state === "broken" || integrity.state === "rewritten";
  const title = bad ? "This log has been altered" : "Log intact";
  const detail =
    integrity.state === "intact"
      ? `${integrity.length} entr${integrity.length === 1 ? "y" : "ies"} · every link checked on this device${integrity.since ? ` · watched since ${fmtDateTime(integrity.since)}` : ""}`
      : integrity.state === "broken"
        ? `Entry #${integrity.seq} ${integrity.reason === "gap" ? "follows a missing entry" : integrity.reason === "broken-link" ? "doesn't link to the entry before it" : "no longer matches what was recorded"}.`
        : `Entry #${integrity.seq}, which this device verified on ${fmtDateTime(integrity.rememberedAt)}, has been ${integrity.reason === "missing" ? "removed" : "changed"}.`;

  return (
    <section className={`overflow-hidden rounded-[var(--radius-card)] ${bad ? "border border-critical/30 bg-critical-tint" : "glass"}`}>
      <div className="flex items-start gap-3 p-4">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${bad ? "bg-white/70 text-critical" : "bg-positive-tint text-positive"}`}>
          {bad ? <ShieldX size={20} /> : <ShieldCheck size={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-callout font-semibold ${bad ? "text-critical" : ""}`}>{title}</p>
          <p className={`tnum text-footnote ${bad ? "text-critical" : "text-ink-2"}`}>{detail}</p>
          {integrity.state === "intact" && (
            <p className="mono mt-1 flex items-center gap-1 truncate text-caption text-ink-3"><Link2 size={12} /> head #{integrity.head.seq} · {integrity.head.hash.slice(0, 10)}…{integrity.head.hash.slice(-6)}</p>
          )}
          {bad && supportEnabled && <button onClick={openSupport} className="btn mt-3 min-h-9 bg-critical px-3 text-footnote text-white">Report this to CLANCLAST</button>}
        </div>
      </div>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`flex w-full items-center justify-between border-t px-4 py-2.5 text-footnote font-medium ${bad ? "border-critical/20 text-critical" : "border-hairline text-ink-2"}`}>
        How this works <ChevronDown size={16} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className={`enter space-y-2 px-4 pb-4 text-footnote ${bad ? "text-critical" : "text-ink-2"}`}>
          <p>Each entry is sealed with a fingerprint (SHA-256) of its contents and of the entry before it, forming a chain. Changing, deleting or reordering any entry breaks every link after it.</p>
          <p>Your phone recomputes every fingerprint itself. It doesn't rely on CLANCLAST saying the log is fine. It also remembers the last entry it checked, so history it has already seen can't quietly change.</p>
          <p>Whether you've marked an emergency access as reviewed is your own note, so it isn't part of the fingerprint.</p>
        </div>
      )}
    </section>
  );
}
