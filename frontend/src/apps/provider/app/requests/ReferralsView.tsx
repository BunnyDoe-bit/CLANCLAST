import { useCallback, useEffect, useState } from "react";
import { Plus, Send } from "lucide-react";
import { ApiError, connectApi, providerApi, type Directory } from "../../lib/api";
import { ago } from "../lib/format";
import { Segmented } from "../ui/controls";
import { Sheet } from "../ui/Sheet";
import { PatientPicker, type PickedPatient } from "../patients/PatientPicker";
import { SCOPES } from "./ConsentView";

/** Referrals you've sent. Each one asks the patient's consent before anything moves. */
type Ref = { id: string; patient: string; toOrganization: string; reason: string; urgency: string; status: string; createdAt: string };
const STATUS: Record<string, [string, string]> = {
  AWAITING_CONSENT: ["Waiting on the patient", "bg-warning-tint text-warning"],
  SENT: ["Sent", "bg-accent-tint text-accent"], ACCEPTED: ["Accepted", "bg-positive-tint text-positive"],
  DECLINED: ["Declined", "bg-surface-2 text-ink-2"], COMPLETED: ["Completed", "bg-positive-tint text-positive"],
};
let cache: Ref[] | null = null;

export default function ReferralsView() {
  const [rows, setRows] = useState<Ref[] | null>(cache);
  const [creating, setCreating] = useState(false);
  const load = useCallback(() => providerApi.referrals().then((r) => { cache = r; setRows(r); }).catch(() => setRows([])), []);
  useEffect(() => { load(); }, [load]);
  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="large-title">Referrals</h1>
          <p className="mt-1 text-subhead text-ink-2">Referrals you’ve sent. Nothing moves until the patient consents.</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn btn-primary"><Plus size={16} /> New referral</button>
      </div>
      {!rows ? <div className="skeleton h-40 !rounded-[var(--radius-card)]" /> : rows.length === 0 ? (
        <div className="glass p-8 text-center"><Send size={22} className="mx-auto text-ink-3" /><p className="mt-2 text-footnote text-ink-2">No referrals yet.</p></div>
      ) : (
        <ul className="glass divide-y divide-[var(--hairline)] px-4">
          {rows.map((r) => {
            const [label, tone] = STATUS[r.status] ?? [r.status, "bg-surface-2 text-ink-2"];
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-subhead font-semibold">{r.patient} <span className="font-normal text-ink-2">→ {r.toOrganization}</span></span>
                  <span className="block truncate text-footnote text-ink-2">{r.reason}</span>
                </span>
                {r.urgency && r.urgency.toLowerCase() !== "routine" && <span className="badge bg-critical-tint text-critical">{r.urgency.charAt(0).toUpperCase() + r.urgency.slice(1).toLowerCase()}</span>}
                <span className="tnum text-caption text-ink-3">{ago(r.createdAt)}</span>
                <span className={`badge ${tone}`}>{label}</span>
              </li>
            );
          })}
        </ul>
      )}
      {creating && <NewReferral close={() => setCreating(false)} done={() => { setCreating(false); load(); }} />}
    </>
  );
}

function NewReferral({ close, done }: { close: () => void; done: () => void }) {
  const [patient, setPatient] = useState<PickedPatient | null>(null);
  const [dir, setDir] = useState<Directory | null>(null);
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [urgency, setUrgency] = useState<"Routine" | "Urgent">("Routine");
  const [scope, setScope] = useState<string[]>(["Referral information", "Consultation note"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { connectApi.directory().then(setDir).catch(() => {}); }, []);
  async function send() {
    if (!patient) return;
    setBusy(true); setError("");
    try { await providerApi.createReferral({ patientId: patient.id, toOrganizationId: to, reason: reason.trim(), urgency, scope }); done(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Couldn’t send the referral."); setBusy(false); }
  }
  return (
    <Sheet title="New referral" close={close} wide>
      {!patient ? <PatientPicker onPick={setPatient} /> : (
        <div className="space-y-4">
          <button onClick={() => setPatient(null)} className="flex w-full items-center justify-between rounded-[14px] bg-surface-2 px-3.5 py-2.5 text-left">
            <span><span className="block text-subhead font-semibold">{patient.fullName}</span><span className="mono text-caption text-ink-2">{patient.humanetId}</span></span>
            <span className="text-caption font-semibold text-accent">Change</span>
          </button>
          <label className="field"><span className="field-label">Refer to</span>
            <select className="input" value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">Choose an institution</option>
              {dir?.organizations.filter((o) => !o.isOwnOrganization).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
          <label className="field"><span className="field-label">Reason</span><textarea className="input min-h-[80px] py-2.5" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Cardiology review for uncontrolled hypertension" /></label>
          <Segmented label="Urgency" value={urgency} onChange={setUrgency} options={[{ v: "Routine", label: "Routine" }, { v: "Urgent", label: "Urgent" }]} />
          <div>
            <p className="field-label mb-2">The patient is asked to share</p>
            <div className="flex flex-wrap gap-2">{SCOPES.map((s) => <button key={s} type="button" role="checkbox" aria-checked={scope.includes(s)} onClick={() => setScope((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]))} className={`rounded-full px-3 py-1.5 text-footnote font-medium ${scope.includes(s) ? "bg-ink text-[var(--canvas-base)]" : "bg-surface-2 text-ink-2"}`}>{s}</button>)}</div>
          </div>
          {error && <p role="alert" className="text-footnote text-critical">{error}</p>}
          <button onClick={send} disabled={busy || !to || reason.trim().length < 3 || scope.length === 0} className="btn btn-primary btn-block">{busy ? "Sending…" : "Send referral"}</button>
        </div>
      )}
    </Sheet>
  );
}
