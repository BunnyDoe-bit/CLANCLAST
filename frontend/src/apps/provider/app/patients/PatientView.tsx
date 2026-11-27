import { useEffect, useState } from "react";
import { AlertOctagon, BadgeCheck, ChevronLeft, FileSignature, Handshake, Phone, ShieldAlert } from "lucide-react";
import { ApiError, providerApi, type EmergencyResult, type PatientDetail } from "../../lib/api";
import { navigate, useParam } from "../lib/router";
import { ago, fmtDate, fmtDateTime } from "../lib/format";
import { Sheet } from "../ui/Sheet";

/**
 * One patient, as CLANCLAST knows them: identity, consent, the summaries they
 * carry, identity links, and every access by your institution. No clinical
 * record: that lives in your own system (Canon Rule 1).
 */
const CONSENT_TONE: Record<string, string> = {
  PENDING: "bg-warning-tint text-warning", APPROVED: "bg-positive-tint text-positive", DECLINED: "bg-surface-2 text-ink-2", REVOKED: "bg-critical-tint text-critical", EXPIRED: "bg-surface-2 text-ink-2",
};
const DURATION: Record<string, string> = { ONCE: "one visit", SEVEN_DAYS: "7 days", UNTIL_REVOKED: "until revoked" };

export default function PatientView() {
  const id = useParam("id");
  const [p, setP] = useState<PatientDetail | null>(null);
  const [error, setError] = useState("");
  const [breakGlass, setBreakGlass] = useState(false);

  useEffect(() => {
    if (!id) return;
    setP(null); setError("");
    providerApi.patient(id).then(setP).catch((e) => setError(e instanceof ApiError ? e.message : "Couldn’t load this patient."));
  }, [id]);

  return (
    <>
      <button onClick={() => navigate("patients")} className="-ml-1.5 mb-1 inline-flex items-center gap-0.5 text-subhead font-medium text-accent"><ChevronLeft size={18} /> Patients</button>
      {error ? <p role="alert" className="glass mt-3 p-5 text-footnote text-critical">{error}</p> : !p ? (
        <div className="mt-3 space-y-3"><div className="skeleton h-10 w-72" /><div className="skeleton h-40 !rounded-[var(--radius-card)]" /></div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="large-title">{p.fullName}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-subhead text-ink-2">
                <span className="mono">{p.humanetId}</span>
                {p.identityVerified ? <span className="badge bg-positive-tint text-positive"><BadgeCheck size={13} /> Identity verified</span> : <span className="badge bg-warning-tint text-warning">Identity check pending</span>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setBreakGlass(true)} className="btn btn-quiet text-critical"><AlertOctagon size={16} /> Emergency access</button>
              <button onClick={() => navigate("consent", { search: `request=${p.id}` })} className="btn btn-quiet"><Handshake size={16} /> Request access</button>
              <button onClick={() => navigate("summaries", { search: `issue=${p.id}` })} disabled={!p.identityVerified} className="btn btn-primary"><FileSignature size={16} /> Issue summary</button>
            </div>
          </div>

          <div className="grid items-start gap-3 @5xl/app:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="grid min-w-0 gap-3">
              <Card title="Consent">
                {p.consent.active ? (
                  <div className="rounded-[14px] bg-positive-tint p-3.5 text-footnote text-positive">
                    <p className="font-semibold">Access approved{p.consent.active.duration ? ` for ${DURATION[p.consent.active.duration] ?? p.consent.active.duration}` : ""}</p>
                    <p className="mt-0.5">{p.consent.active.scope.join(", ")}{p.consent.active.expiresAt ? ` · until ${fmtDateTime(p.consent.active.expiresAt)}` : ""}</p>
                  </div>
                ) : <p className="text-footnote text-ink-2">No active access. Request it and the patient approves on their phone, card or USSD.</p>}
                {p.consent.history.length > 0 && (
                  <ul className="mt-3 divide-y divide-[var(--hairline)]">
                    {p.consent.history.map((c) => (
                      <li key={c.id} className="flex items-center gap-3 py-2 text-footnote">
                        <span className="min-w-0 flex-1 truncate">{c.scope.join(", ")}</span>
                        <span className="tnum text-ink-3">{fmtDate(c.createdAt)}</span>
                        <span className={`badge ${CONSENT_TONE[c.status] ?? "bg-surface-2 text-ink-2"}`}>{c.status.charAt(0) + c.status.slice(1).toLowerCase()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Signed summaries they carry">
                {p.summaries.length === 0 ? <p className="text-footnote text-ink-2">None issued yet.{p.identityVerified ? " Issue one so other clinics can read it offline." : " Verify their identity first."}</p> : <SummaryList list={p.summaries} />}
                <p className="mt-2 text-caption text-ink-3">CLANCLAST keeps that these were issued, never what they say.</p>
              </Card>

              <Card title="Access by your institution">
                {p.access.length === 0 ? <p className="text-footnote text-ink-2">Nothing yet.</p> : (
                  <ul className="space-y-2">
                    {p.access.map((a) => (
                      <li key={a.id} className="flex items-start gap-2.5 text-footnote">
                        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${a.isEmergency ? "bg-critical" : "bg-accent"}`} />
                        <span className="min-w-0 flex-1"><span className={a.isEmergency ? "font-semibold text-critical" : ""}>{a.action}</span>{a.by && <span className="text-ink-2"> · {a.by}</span>}</span>
                        <span className="tnum shrink-0 text-ink-3">{ago(a.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-caption text-ink-3">The patient sees every entry in their own tamper-evident access log.</p>
              </Card>
            </div>

            <div className="grid min-w-0 gap-3">
              <Card title="Identity">
                <dl className="space-y-2 text-footnote">
                  <Row k="Date of birth" v={fmtDate(p.dateOfBirth)} />
                  <Row k="Registered" v={`${fmtDate(p.createdAt)} by ${p.registeredBy === "staff" ? "clinic staff" : "the patient"}`} />
                  <Row k="Emergency contact" v={p.emergencyContact ? `${p.emergencyContact.name}${p.emergencyContact.relationship ? ` (${p.emergencyContact.relationship})` : ""}` : "Not recorded"} />
                </dl>
              </Card>
              {p.credentials.length > 0 && (
                <Card title="Credentials">
                  <ul className="space-y-1.5 text-footnote">{p.credentials.map((c) => <li key={c.id} className="flex justify-between gap-3"><span>{c.type} · <span className="text-ink-2">{c.issuer}</span></span><span className="text-ink-2">{c.status}</span></li>)}</ul>
                </Card>
              )}
            </div>
          </div>

          {breakGlass && <BreakGlass p={p} close={() => setBreakGlass(false)} />}
        </>
      )}
    </>
  );
}

/** Latest version per issuer and tier first; earlier versions fold away. */
function SummaryList({ list }: { list: PatientDetail["summaries"] }) {
  const [all, setAll] = useState(false);
  const key = (s: PatientDetail["summaries"][number]) => `${s.issuer}|${s.tier}`;
  const latest = new Map<string, number>();
  for (const s of list) if (!s.revokedAt) latest.set(key(s), Math.max(latest.get(key(s)) ?? 0, s.version));
  const current = list.filter((s) => !s.revokedAt && latest.get(key(s)) === s.version);
  const older = list.filter((s) => !current.includes(s));
  const row = (s: PatientDetail["summaries"][number]) => {
    const st = s.revokedAt ? ["Revoked", "bg-critical-tint text-critical"] : new Date(s.expiresAt) < new Date() ? ["Expired", "bg-warning-tint text-warning"] : latest.get(key(s)) === s.version ? ["Current", "bg-positive-tint text-positive"] : ["Superseded", "bg-surface-2 text-ink-2"];
    return (
      <li key={s.id} className="flex items-center gap-3 py-2 text-footnote">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-accent-tint text-caption font-bold text-accent">T{s.tier}</span>
        <span className="min-w-0 flex-1"><span className="block font-semibold">v{s.version} · {s.issuer}{s.ownIssuer ? " (you)" : ""}</span><span className="tnum block text-ink-3">issued {fmtDate(s.issuedAt)} · expires {fmtDate(s.expiresAt)}</span></span>
        <span className={`badge ${st[1]}`}>{st[0]}</span>
      </li>
    );
  };
  return (
    <>
      <ul className="divide-y divide-[var(--hairline)]">{(current.length ? current : list.slice(0, 1)).map(row)}{all && older.map(row)}</ul>
      {older.length > 0 && <button onClick={() => setAll((x) => !x)} className="mt-1 text-footnote font-semibold text-accent">{all ? "Hide earlier versions" : `${older.length} earlier or revoked`}</button>}
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="glass min-w-0 p-5"><h2 className="mb-3 text-headline font-semibold">{title}</h2>{children}</section>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4"><dt className="text-ink-2">{k}</dt><dd className="text-right font-medium">{v}</dd></div>;
}

/**
 * Break-glass. The reason is required, the patient is notified at once, and the
 * entry is marked as an emergency in their access log. What comes back is who
 * the person is and who to call, never clinical data: CLANCLAST holds none.
 */
function BreakGlass({ p, close }: { p: PatientDetail; close: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [r, setR] = useState<EmergencyResult | null>(null);
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { setR(await providerApi.emergencyAccess(p.id, reason.trim())); } catch (err) { setError(err instanceof ApiError ? err.message : "Couldn’t reach CLANCLAST."); } finally { setBusy(false); }
  }
  return (
    <Sheet title={r ? "Emergency access" : "Use emergency access?"} close={close}>
      {!r ? (
        <form onSubmit={go}>
          <p className="flex gap-2.5 rounded-[14px] bg-critical-tint px-3.5 py-3 text-footnote text-critical"><ShieldAlert size={17} className="mt-0.5 shrink-0" />{p.fullName.split(" ")[0]} is notified straight away, and this is marked as an emergency in their access log for review.</p>
          <label className="field mt-4">
            <span className="field-label">Reason</span>
            <textarea className="input min-h-[88px] py-2.5" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Unconscious after a road accident, brought in by ambulance" />
          </label>
          {error && <p role="alert" className="mt-2 text-footnote text-critical">{error}</p>}
          <button type="submit" disabled={busy || reason.trim().length < 10} className="btn btn-block mt-4 bg-critical text-white">{busy ? "Opening…" : "Use emergency access"}</button>
        </form>
      ) : (
        <div className="space-y-4">
          <div><p className="text-title-3 font-semibold">{r.fullName}</p><p className="mono text-footnote text-ink-2">{r.humanetId} · born {fmtDate(r.dateOfBirth)}</p></div>
          <div className="rounded-[14px] bg-surface-2 p-3.5">
            <p className="eyebrow mb-1">Emergency contact</p>
            {r.emergencyContact ? <p className="flex items-center gap-2 text-callout font-semibold"><Phone size={16} className="text-accent" />{r.emergencyContact.name}{r.emergencyContact.relationship ? ` (${r.emergencyContact.relationship})` : ""}</p> : <p className="text-footnote text-ink-2">Not recorded</p>}
          </div>
          <div>
            <p className="eyebrow mb-1">Clinical information</p>
            {r.summaryIssuers.length ? (
              <p className="text-footnote">They may be carrying a signed summary from <b className="font-semibold">{r.summaryIssuers.map((i) => i.name).join(", ")}</b>. Check their phone or card and scan it under Summaries → Verify; it works offline. Then contact the issuer to confirm.</p>
            ) : <p className="text-footnote">No current signed summary on record. Contact the institutions that treat them; CLANCLAST holds no clinical records.</p>}
          </div>
          <button onClick={() => navigate("summary-verify")} className="btn btn-primary btn-block">Verify their summary</button>
        </div>
      )}
    </Sheet>
  );
}
