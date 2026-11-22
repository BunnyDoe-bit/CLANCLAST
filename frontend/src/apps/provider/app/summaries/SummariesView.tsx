import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck, Check, ChevronDown, Copy, FileCheck2, FileSignature, KeyRound, Plus, RotateCw, ScanLine, Search, ShieldCheck, Smartphone, Trash2, X,
} from "lucide-react";
import { ApiError, PATIENT_APP_URL, providerApi, summariesApi, type IssueResult, type Issued, type SummariesState, type SummaryContent } from "../../lib/api";
import { navigate, useParam } from "../lib/router";
import { ago, fmtDate } from "../lib/format";
import { Segmented, TextField } from "../ui/controls";
import { Sheet } from "../ui/Sheet";
import { QrSvg } from "../trust/QrSvg";
import { packForLink } from "../trust/qrcodec";
import { SummaryContentView } from "../trust/SummaryContentView";

/**
 * Signed summaries this institution issues (Blueprint §13.3.4). The clinician
 * signs; the patient carries; CLANCLAST keeps only that it was issued. The
 * signed document exists in this browser until it's handed over, then nowhere
 * but the patient's vault.
 */
const TIERS = {
  1: { name: "Emergency summary", short: "Tier 1", detail: "Allergies, chronic conditions, current medication, blood group, alerts. Valid 90 days." },
  2: { name: "Continuity summary", short: "Tier 2", detail: "Tier 1 plus recent diagnoses, procedures, key results, active referrals. Valid 30 days." },
} as const;

let cache: SummariesState | null = null;

export default function SummariesView() {
  const issueFor = useParam("issue");
  const [state, setState] = useState<SummariesState | null>(cache);
  const [error, setError] = useState("");
  const [issuing, setIssuing] = useState(!!issueFor);
  const [revoking, setRevoking] = useState<Issued | null>(null);

  const load = useCallback(() => summariesApi.state().then((s) => { cache = s; setState(s); }).catch((e) => setError(e instanceof ApiError ? e.message : "Couldn’t load summaries.")), []);
  useEffect(() => { load(); }, [load]);

  if (issuing) return <IssueFlow initialPatientId={issueFor} onClose={() => { setIssuing(false); navigate("summaries", { replace: true }); load(); }} />;

  const active = state?.keys.find((k) => k.status === "ACTIVE");
  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="large-title">Summaries</h1>
          <p className="mt-1 text-subhead text-ink-2">Signed snapshots your patients carry. CLANCLAST records that you issued them, never what they say.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate("summary-verify")} className="btn btn-quiet"><FileCheck2 size={16} /> Verify</button>
          <button onClick={() => setIssuing(true)} className="btn btn-primary"><Plus size={16} /> Issue a summary</button>
        </div>
      </div>

      {error && <p role="alert" className="mb-3 rounded-[14px] bg-critical-tint px-3.5 py-2.5 text-footnote text-critical">{error}</p>}

      <div className="grid items-start gap-3 @5xl/app:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <IssuedList issued={state?.issued ?? null} onRevoke={setRevoking} />
        <KeyCard state={state} active={active} reload={load} />
      </div>

      {revoking && <RevokeSheet s={revoking} close={() => setRevoking(null)} done={(u) => { setState((st) => st && { ...st, issued: st.issued.map((x) => (x.id === u.id ? { ...x, revokedAt: u.revokedAt, revokedReason: u.revokedReason } : x)) }); setRevoking(null); }} />}
    </>
  );
}

/* ---------------------------------------------------------------- issued */

function status(s: Issued, all: Issued[]) {
  if (s.revokedAt) return { label: "Revoked", tone: "bg-critical-tint text-critical" };
  if (new Date(s.expiresAt).getTime() < Date.now()) return { label: "Expired", tone: "bg-warning-tint text-warning" };
  // A newer version for the same patient and tier replaces this one (Blueprint §13.3.6: v4 supersedes v3).
  if (all.some((o) => o.patient?.id === s.patient?.id && o.tier === s.tier && o.version > s.version && !o.revokedAt)) return { label: "Superseded", tone: "bg-surface-2 text-ink-2" };
  return { label: "Current", tone: "bg-positive-tint text-positive" };
}

function IssuedList({ issued, onRevoke }: { issued: Issued[] | null; onRevoke: (s: Issued) => void }) {
  return (
    <section className="glass min-w-0 p-5">
      <h2 className="mb-3 text-headline font-semibold">Issued by your institution</h2>
      {!issued ? <ul className="space-y-3">{[0, 1, 2].map((i) => <li key={i} className="skeleton h-12 w-full !rounded-[12px]" />)}</ul>
        : issued.length === 0 ? (
          <div className="py-8 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-tint text-accent"><FileSignature size={22} /></span>
            <p className="mt-3 text-callout font-semibold">Nothing issued yet</p>
            <p className="mx-auto mt-1 max-w-[42ch] text-footnote text-ink-2">Issue a patient their emergency summary so the next clinic can read it, even when your system is offline.</p>
          </div>
        ) : (
          <ul className="-mx-2">
            {issued.map((s) => {
              const st = status(s, issued);
              return (
                <li key={s.id} className="flex items-center gap-3 rounded-[14px] px-2 py-2.5 hover:bg-[var(--glass)]">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-accent-tint text-footnote font-bold text-accent">T{s.tier}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-subhead font-semibold">{s.patient?.fullName ?? "Patient"} <span className="font-normal text-ink-2">· v{s.version}</span></span>
                    <span className="tnum block truncate text-caption text-ink-2">{TIERS[s.tier].name} · issued {fmtDate(s.issuedAt)} · {s.revokedAt ? `revoked ${fmtDate(s.revokedAt)}` : `expires ${fmtDate(s.expiresAt)}`}</span>
                    <span className={`badge mt-1 @xl/app:hidden ${st.tone}`}>{st.label}</span>
                  </span>
                  <span className={`badge hidden shrink-0 @xl/app:inline-flex ${st.tone}`}>{st.label}</span>
                  {!s.revokedAt && <button onClick={() => onRevoke(s)} aria-label={`Revoke ${s.patient?.fullName ?? ""} Tier ${s.tier} v${s.version}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-critical-tint hover:text-critical"><Trash2 size={15} /></button>}
                </li>
              );
            })}
          </ul>
        )}
    </section>
  );
}

const REASONS = [
  { v: "ISSUED_IN_ERROR", label: "Issued in error" },
  { v: "SUPERSEDED", label: "Replaced by a newer one" },
  { v: "PATIENT_REQUEST", label: "Patient asked" },
] as const;

function RevokeSheet({ s, close, done }: { s: Issued; close: () => void; done: (u: Issued) => void }) {
  const [reason, setReason] = useState<(typeof REASONS)[number]["v"]>("ISSUED_IN_ERROR");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function go() {
    setBusy(true); setError("");
    try { done(await summariesApi.revoke(s.id, reason)); } catch (e) { setError(e instanceof ApiError ? e.message : "Couldn’t revoke it."); setBusy(false); }
  }
  return (
    <Sheet title="Revoke this summary?" close={close}>
      <p className="text-subhead text-ink-2">{s.patient?.fullName}’s {TIERS[s.tier].name.toLowerCase()} v{s.version} stops verifying wherever the Trust Registry has synced. Verifiers that are offline see it once they reconnect.</p>
      <div className="mt-4"><Segmented label="Reason" size="sm" value={reason} onChange={setReason} options={REASONS.map((r) => ({ v: r.v, label: r.label }))} /></div>
      {error && <p role="alert" className="mt-3 text-footnote text-critical">{error}</p>}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button onClick={close} className="btn btn-quiet">Keep it</button>
        <button onClick={go} disabled={busy} className="btn bg-critical text-white">{busy ? "Revoking…" : "Revoke"}</button>
      </div>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- signing key */

function KeyCard({ state, active, reload }: { state: SummariesState | null; active?: SummariesState["keys"][number]; reload: () => void }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const old = state?.keys.filter((k) => k.status !== "ACTIVE") ?? [];
  async function run(fn: () => Promise<unknown>) { setBusy(true); try { await fn(); reload(); } finally { setBusy(false); setConfirm(false); } }
  return (
    <section className="glass p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-ink text-[var(--canvas-base)]"><KeyRound size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-headline font-semibold">Your signing key</p>
          <p className="truncate text-caption text-ink-2">{state?.issuer.name ?? " "}</p>
        </div>
        {active && <span className="badge bg-positive-tint text-positive"><BadgeCheck size={13} /> Active</span>}
      </div>
      {!state ? <div className="skeleton mt-4 h-16 w-full !rounded-[12px]" /> : active ? (
        <>
          <dl className="mt-4 space-y-2 text-footnote">
            <div className="flex justify-between gap-3"><dt className="text-ink-2">Key ID</dt><dd className="mono">{active.kid}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-2">Fingerprint</dt><dd className="mono">{active.fingerprint}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-2">Algorithm</dt><dd>{active.algorithm}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-2">Created</dt><dd className="tnum">{fmtDate(active.createdAt)}</dd></div>
          </dl>
          <p className="mt-4 flex gap-2 rounded-[14px] bg-accent-tint px-3 py-2.5 text-footnote text-accent"><ShieldCheck size={16} className="mt-0.5 shrink-0" />Published in the Trust Registry. Any clinic can check your signature offline. The private key never leaves CLANCLAST’s encrypted store.</p>
          {confirm ? (
            <div className="mt-3 rounded-[14px] bg-warning-tint p-3 text-footnote text-warning">
              <p>A new key signs from now on. Summaries already issued keep verifying.</p>
              <div className="mt-2 flex gap-2"><button onClick={() => setConfirm(false)} className="btn btn-quiet h-9">Cancel</button><button onClick={() => run(summariesApi.rotate)} disabled={busy} className="btn btn-primary h-9">{busy ? "Rotating…" : "Rotate key"}</button></div>
            </div>
          ) : <button onClick={() => setConfirm(true)} className="btn btn-quiet btn-block mt-3"><RotateCw size={16} /> Rotate key</button>}
        </>
      ) : (
        <>
          <p className="mt-3 text-footnote text-ink-2">Your institution doesn’t have a signing key yet. One is created and published the first time you issue a summary, or now.</p>
          <button onClick={() => run(summariesApi.ensureKey)} disabled={busy} className="btn btn-primary btn-block mt-3">{busy ? "Creating…" : "Create signing key"}</button>
        </>
      )}
      {old.length > 0 && (
        <div className="mt-4 border-t border-hairline pt-3">
          <button onClick={() => setShowOld((x) => !x)} className="flex w-full items-center justify-between text-footnote font-semibold text-ink-2">Previous keys ({old.length}) <ChevronDown size={15} className={showOld ? "rotate-180" : ""} /></button>
          {showOld && <ul className="mt-2 space-y-1.5">{old.map((k) => <li key={k.kid} className="flex justify-between text-caption"><span className="mono">{k.kid}</span><span className="text-ink-2">{k.status === "REVOKED" ? "Revoked" : `Retired ${fmtDate(k.retiredAt!)}`}</span></li>)}</ul>}
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- issue */

type Patient = { id: string; humanetId: string; fullName: string; identityVerified: boolean };
type Draft = { bloodGroup: string; allergies: string; chronicConditions: string; currentMedication: string; alerts: string; recentDiagnoses: string; procedures: string; activeReferrals: string; keyResults: { name: string; value: string; unit: string; date: string }[] };
const EMPTY: Draft = { bloodGroup: "", allergies: "", chronicConditions: "", currentMedication: "", alerts: "", recentDiagnoses: "", procedures: "", activeReferrals: "", keyResults: [] };
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const BLOOD = ["", "O+", "O−", "A+", "A−", "B+", "B−", "AB+", "AB−"];

function toContent(d: Draft, tier: 1 | 2): SummaryContent {
  const base = { bloodGroup: d.bloodGroup || undefined, allergies: lines(d.allergies), chronicConditions: lines(d.chronicConditions), currentMedication: lines(d.currentMedication), alerts: lines(d.alerts) };
  if (tier === 1) return base;
  return { ...base, recentDiagnoses: lines(d.recentDiagnoses), procedures: lines(d.procedures), activeReferrals: lines(d.activeReferrals), keyResults: d.keyResults.filter((r) => r.name.trim() && r.value.trim()).map((r) => ({ name: r.name.trim(), value: r.value.trim(), unit: r.unit.trim(), ...(r.date.trim() ? { date: r.date.trim() } : {}) })) };
}

function IssueFlow({ initialPatientId, onClose }: { initialPatientId: string | null; onClose: () => void }) {
  const [step, setStep] = useState<"patient" | "content" | "review" | "handoff">("patient");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [tier, setTier] = useState<1 | 2>(1);
  const [d, setD] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ r: IssueResult; link: string } | null>(null);
  const content = useMemo(() => toContent(d, tier), [d, tier]);
  const set = (k: keyof Draft) => (v: string) => setD((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!initialPatientId) return;
    providerApi.patient(initialPatientId).then((p) => { setPatient({ id: p.id, humanetId: p.humanetId, fullName: p.fullName, identityVerified: p.identityVerified }); if (p.identityVerified) setStep("content"); }).catch(() => {});
  }, [initialPatientId]);

  async function sign() {
    if (!patient) return;
    setBusy(true); setError("");
    try {
      const r = await summariesApi.issue({ patientId: patient.id, tier, content });
      const link = `${PATIENT_APP_URL}/vault#add=${await packForLink(r.jws)}`;
      setResult({ r, link }); setStep("handoff");
    } catch (e) { setError(e instanceof ApiError ? e.message : "Couldn’t sign the summary. Check your connection."); }
    finally { setBusy(false); }
  }

  const title = { patient: "Who is it for?", content: TIERS[tier].name, review: "Check and sign", handoff: "Hand it over" }[step];

  return (
    <>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Issue a summary{patient ? ` · ${patient.fullName}` : ""}</p>
          <h1 className="large-title mt-1">{title}</h1>
        </div>
        <button onClick={onClose} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2"><X size={18} /></button>
      </div>
      <ol className="mb-5 flex gap-1.5" aria-label="Progress">{(["patient", "content", "review", "handoff"] as const).map((s, i, all) => <li key={s} className={`h-1 flex-1 rounded-full ${all.indexOf(step) >= i ? "bg-accent" : "bg-surface-3"}`} />)}</ol>
      {error && <p role="alert" className="mb-3 rounded-[14px] bg-critical-tint px-3.5 py-2.5 text-footnote text-critical">{error}</p>}

      {step === "patient" && <PickPatient onPick={(p) => { setPatient(p); setStep("content"); }} />}

      {step === "content" && (
        <div className="grid items-start gap-3 @5xl/app:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <section className="glass min-w-0 p-5">
            <Segmented<"1" | "2"> label="Tier" value={String(tier) as "1" | "2"} onChange={(v) => setTier(Number(v) as 1 | 2)} options={[{ v: "1", label: "Tier 1 · Emergency" }, { v: "2", label: "Tier 2 · Continuity" }]} />
            <p className="mt-2 text-footnote text-ink-2">{TIERS[tier].detail}</p>
            <div className="mt-5 grid gap-4 @xl/app:grid-cols-2">
              <label className="field">
                <span className="field-label">Blood group</span>
                <select className="input" value={d.bloodGroup} onChange={(e) => set("bloodGroup")(e.target.value)}>{BLOOD.map((b) => <option key={b} value={b}>{b || "Not recorded"}</option>)}</select>
              </label>
              <span className="hidden @xl/app:block" />
              <Lines label="Allergies" hint="One per line, with reaction" value={d.allergies} onChange={set("allergies")} placeholder={"Penicillin — rash"} />
              <Lines label="Chronic conditions" value={d.chronicConditions} onChange={set("chronicConditions")} placeholder="Hypertension, controlled" />
              <Lines label="Current medication" value={d.currentMedication} onChange={set("currentMedication")} placeholder="Amlodipine 5 mg, once daily" />
              <Lines label="Alerts" value={d.alerts} onChange={set("alerts")} placeholder="Fall risk" />
              {tier === 2 && <>
                <Lines label="Recent diagnoses" value={d.recentDiagnoses} onChange={set("recentDiagnoses")} />
                <Lines label="Procedures" value={d.procedures} onChange={set("procedures")} />
                <Lines label="Active referrals" value={d.activeReferrals} onChange={set("activeReferrals")} />
                <KeyResults rows={d.keyResults} onChange={(keyResults) => setD((x) => ({ ...x, keyResults }))} />
              </>}
            </div>
          </section>
          <aside className="glass p-5">
            <p className="flex gap-2 text-footnote text-ink-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-accent" />In a live deployment these fields are filled from your own system over HL7 FHIR. CLANCLAST signs them in memory and keeps no copy.</p>
            <button onClick={() => setStep("review")} className="btn btn-primary btn-block mt-4">Review</button>
            <button onClick={() => setStep("patient")} className="btn btn-quiet btn-block mt-2">Change patient</button>
          </aside>
        </div>
      )}

      {step === "review" && patient && (
        <div className="grid items-start gap-3 @5xl/app:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <section className="glass min-w-0 p-5">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-headline font-semibold">{patient.fullName} <span className="mono text-footnote font-normal text-ink-2">{patient.humanetId}</span></p>
              <span className="badge bg-accent-tint text-accent">{TIERS[tier].short}</span>
            </div>
            <SummaryContentView c={content} tier={tier} />
          </section>
          <aside className="glass p-5">
            <p className="text-callout font-semibold">Sign as your institution</p>
            <p className="mt-1 text-footnote text-ink-2">Once signed it can’t be edited, only replaced by a newer version or revoked. It shows the date, your institution and an advisory that your records remain the authority.</p>
            <button onClick={sign} disabled={busy} className="btn btn-primary btn-block mt-4"><FileSignature size={16} /> {busy ? "Signing…" : "Sign and issue"}</button>
            <button onClick={() => setStep("content")} className="btn btn-quiet btn-block mt-2">Edit</button>
          </aside>
        </div>
      )}

      {step === "handoff" && result && <Handoff r={result.r} link={result.link} onDone={onClose} />}
    </>
  );
}

function Lines({ label, hint, value, onChange, placeholder }: { label: string; hint?: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label} {hint && <span className="text-ink-3">· {hint}</span>}</span>
      <textarea className="input min-h-[88px] resize-y py-2.5" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} />
    </label>
  );
}

function KeyResults({ rows, onChange }: { rows: Draft["keyResults"]; onChange: (r: Draft["keyResults"]) => void }) {
  const upd = (i: number, k: keyof Draft["keyResults"][number], v: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <div className="@xl/app:col-span-2">
      <p className="field-label mb-1.5">Key results</p>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="grid grid-cols-[1.4fr_1fr_0.8fr_1fr_auto] gap-2">
            <input className="input" aria-label="Test" placeholder="HbA1c" value={r.name} onChange={(e) => upd(i, "name", e.target.value)} />
            <input className="input tnum" aria-label="Value" placeholder="6.1" value={r.value} onChange={(e) => upd(i, "value", e.target.value)} />
            <input className="input" aria-label="Unit" placeholder="%" value={r.unit} onChange={(e) => upd(i, "unit", e.target.value)} />
            <input className="input" aria-label="Date" placeholder="2026-10-02" value={r.date} onChange={(e) => upd(i, "date", e.target.value)} />
            <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label="Remove result" className="grid w-9 place-items-center text-ink-3"><X size={16} /></button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onChange([...rows, { name: "", value: "", unit: "", date: "" }])} className="btn btn-quiet mt-2 h-9"><Plus size={15} /> Add result</button>
    </div>
  );
}

function PickPatient({ onPick }: { onPick: (p: Patient) => void }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<Patient[] | null>(null);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => providerApi.patients(q.trim() || undefined).then((r) => live && setList(r)).catch(() => live && setList([])), 160);
    return () => { live = false; clearTimeout(t); };
  }, [q]);
  return (
    <section className="glass p-5">
      <label className="relative block">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
        <input autoFocus className="input pl-11" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patients in your care" aria-label="Search patients" />
      </label>
      <ul className="-mx-2 mt-3">
        {!list ? [0, 1, 2].map((i) => <li key={i} className="skeleton mx-2 mb-2 h-12 !rounded-[12px]" />) : list.length === 0 ? <li className="px-2 py-4 text-footnote text-ink-2">No patients in your care match. Check them in first.</li>
          : list.map((p) => (
            <li key={p.id}>
              <button onClick={() => p.identityVerified && onPick(p)} disabled={!p.identityVerified} className="flex w-full items-center gap-3 rounded-[14px] px-2 py-2.5 text-left hover:bg-[var(--glass)] disabled:opacity-60">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-subhead font-semibold">{p.fullName}</span>
                  <span className="mono block text-caption text-ink-2">{p.humanetId}</span>
                </span>
                {p.identityVerified ? <span className="badge bg-positive-tint text-positive"><BadgeCheck size={13} /> Verified</span>
                  : <span className="badge bg-warning-tint text-warning">Verify identity first</span>}
              </button>
            </li>
          ))}
      </ul>
    </section>
  );
}

function Handoff({ r, link, onDone }: { r: IssueResult; link: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid items-start gap-3 @4xl/app:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="glass p-6 text-center">
        <div className="mx-auto w-full max-w-[520px] rounded-[20px] bg-white p-4"><QrSvg text={link} label={`Signed summary for ${r.patient.fullName}`} /></div>
        <p className="mt-4 text-callout font-semibold">{r.patient.fullName} · {TIERS[r.tier].name} v{r.version}</p>
        <p className="tnum text-footnote text-ink-2">Signed {ago(r.issuedAt)} · valid until {fmtDate(r.expiresAt)}</p>
      </section>
      <section className="glass p-5">
        <ol className="space-y-3">
          {[
            [Smartphone, "Ask the patient to open their phone camera and point it at the code."],
            [ScanLine, "It opens the CLANCLAST app. They unlock their vault and tap Keep in vault."],
            [Check, "Their app checks your signature and that it’s issued to them before keeping it."],
          ].map(([Icon, t], i) => {
            const I = Icon as typeof Check;
            return <li key={i} className="flex gap-3 text-subhead"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-tint text-accent"><I size={16} /></span><span className="pt-1">{t as string}</span></li>;
          })}
        </ol>
        <p className="mt-4 rounded-[14px] bg-warning-tint px-3.5 py-2.5 text-footnote text-warning">This screen holds the only copy. CLANCLAST didn’t keep one. Once you close it, issue a new version if the patient missed it.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* ignore */ } }} className="btn btn-quiet">{copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy link</>}</button>
          <button onClick={onDone} className="btn btn-primary">Done</button>
        </div>
        <a href={link} target="_blank" rel="noopener" className="btn btn-secondary btn-block mt-2"><ScanLine size={16} /> Open in the patient app (demo)</a>
      </section>
    </div>
  );
}
