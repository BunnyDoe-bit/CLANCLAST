import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, Check, Handshake, Plus } from "lucide-react";
import { ApiError, providerApi } from "../../lib/api";
import { navigate, useParam } from "../lib/router";
import { ago } from "../lib/format";
import { Sheet } from "../ui/Sheet";
import { PatientPicker, type PickedPatient } from "../patients/PatientPicker";

/**
 * Consent you've asked patients for (Canon Rule 1: patients own consent).
 * A request reaches the patient's phone, card or USSD; they approve, decline
 * or later revoke. Approval lets you request their records from the
 * institution that holds them, never from CLANCLAST.
 */
type Req = { id: string; patient: string; scope: string[]; status: string; duration: string | null; createdAt: string; respondedAt: string | null };
export const SCOPES = ["Emergency summary (Tier 1)", "Continuity summary (Tier 2)", "Laboratory results", "Medication history", "Imaging reports", "Referral information", "Consultation note"];
const GROUPS: [string, string[], string][] = [
  ["Waiting on the patient", ["PENDING"], "bg-warning-tint text-warning"],
  ["Approved", ["APPROVED"], "bg-positive-tint text-positive"],
  ["Declined, revoked or expired", ["DECLINED", "REVOKED", "EXPIRED"], "bg-surface-2 text-ink-2"],
];
const DURATION: Record<string, string> = { ONCE: "one visit", SEVEN_DAYS: "7 days", UNTIL_REVOKED: "until revoked" };
let cache: Req[] | null = null;

export default function ConsentView() {
  const requestFor = useParam("request");
  const [rows, setRows] = useState<Req[] | null>(cache);
  const [asking, setAsking] = useState(!!requestFor);
  const [nudged, setNudged] = useState<Set<string>>(new Set());
  const load = useCallback(() => providerApi.consentRequests().then((r) => { cache = r; setRows(r); }).catch(() => setRows([])), []);
  useEffect(() => { load(); }, [load]);
  const grouped = useMemo(() => GROUPS.map(([t, st, tone]) => [t, (rows ?? []).filter((r) => st.includes(r.status)), tone] as const), [rows]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="large-title">Consent</h1>
          <p className="mt-1 text-subhead text-ink-2">Access you’ve asked patients for. They decide, on whatever device they have.</p>
        </div>
        <button onClick={() => setAsking(true)} className="btn btn-primary"><Plus size={16} /> Request access</button>
      </div>
      {!rows ? <div className="skeleton h-40 !rounded-[var(--radius-card)]" /> : rows.length === 0 ? (
        <div className="glass p-8 text-center"><Handshake size={22} className="mx-auto text-ink-3" /><p className="mt-2 text-footnote text-ink-2">No requests yet.</p></div>
      ) : grouped.map(([title, list, tone]) => list.length > 0 && (
        <section key={title} className="mb-5">
          <h2 className="eyebrow mb-2 px-1">{title} · <span className="tnum">{list.length}</span></h2>
          <ul className="glass divide-y divide-[var(--hairline)] px-4">
            {list.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-subhead font-semibold">{r.patient}</span>
                  <span className="block truncate text-footnote text-ink-2">{r.scope.join(", ")}</span>
                </span>
                <span className="tnum text-caption text-ink-3">{r.status === "PENDING" ? `asked ${ago(r.createdAt)}` : r.respondedAt ? `${ago(r.respondedAt)}${r.duration ? ` · ${DURATION[r.duration] ?? r.duration}` : ""}` : ""}</span>
                <span className={`badge ${tone}`}>{r.status.charAt(0) + r.status.slice(1).toLowerCase()}</span>
                {r.status === "PENDING" && (
                  nudged.has(r.id) ? <span className="flex items-center gap-1 text-caption font-semibold text-positive"><Check size={14} /> Reminded</span>
                    : <button onClick={() => { setNudged((s) => new Set(s).add(r.id)); providerApi.resendConsentRequest(r.id).catch(() => setNudged((s) => { const n = new Set(s); n.delete(r.id); return n; })); }} className="btn btn-quiet h-8 px-3 text-caption"><BellRing size={14} /> Remind</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {asking && <AskSheet initialPatientId={requestFor} close={() => { setAsking(false); if (requestFor) navigate("consent", { replace: true }); }} done={() => { setAsking(false); load(); if (requestFor) navigate("consent", { replace: true }); }} />}
    </>
  );
}

function AskSheet({ initialPatientId, close, done }: { initialPatientId: string | null; close: () => void; done: () => void }) {
  const [patient, setPatient] = useState<PickedPatient | null>(null);
  const [scope, setScope] = useState<string[]>(["Emergency summary (Tier 1)"]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (initialPatientId) providerApi.patient(initialPatientId).then((p) => setPatient(p)).catch(() => {}); }, [initialPatientId]);
  const toggle = (s: string) => setScope((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]));
  async function send() {
    if (!patient) return;
    setBusy(true); setError("");
    try { await providerApi.requestConsent({ patientId: patient.id, scope, reason: reason.trim() || undefined }); done(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Couldn’t send the request."); setBusy(false); }
  }
  return (
    <Sheet title="Request access" close={close}>
      {!patient ? <PatientPicker onPick={setPatient} /> : (
        <div>
          <button onClick={() => setPatient(null)} className="mb-4 flex w-full items-center justify-between rounded-[14px] bg-surface-2 px-3.5 py-2.5 text-left">
            <span><span className="block text-subhead font-semibold">{patient.fullName}</span><span className="mono text-caption text-ink-2">{patient.humanetId}</span></span>
            <span className="text-caption font-semibold text-accent">Change</span>
          </button>
          <p className="field-label mb-2">What you’re asking for</p>
          <div className="flex flex-wrap gap-2">
            {SCOPES.map((s) => (
              <button key={s} type="button" role="checkbox" aria-checked={scope.includes(s)} onClick={() => toggle(s)}
                className={`rounded-full px-3 py-1.5 text-footnote font-medium transition-colors ${scope.includes(s) ? "bg-ink text-[var(--canvas-base)]" : "bg-surface-2 text-ink-2"}`}>{s}</button>
            ))}
          </div>
          <label className="field mt-4"><span className="field-label">Reason <span className="text-ink-3">· shown to the patient</span></span><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Follow-up after your clinic visit" /></label>
          <p className="mt-3 text-caption text-ink-3">The patient chooses how long to allow: one visit, 7 days or until they revoke it.</p>
          {error && <p role="alert" className="mt-2 text-footnote text-critical">{error}</p>}
          <button onClick={send} disabled={busy || scope.length === 0} className="btn btn-primary btn-block mt-4">{busy ? "Sending…" : "Send request"}</button>
        </div>
      )}
    </Sheet>
  );
}
