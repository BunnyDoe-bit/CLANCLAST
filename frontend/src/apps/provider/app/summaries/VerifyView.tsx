import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, ChevronLeft, CloudOff, RefreshCw, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { navigate } from "../lib/router";
import { ago, fmtDate, fmtDateTime } from "../lib/format";
import { cachedRegistry, syncRegistry, verify, type Snapshot, type Verdict, type Verification } from "../trust/verify";
import { unpack } from "../trust/qrcodec";
import { SummaryContentView } from "../trust/SummaryContentView";
import { CameraScanner } from "../checkin/CheckInView";

/**
 * Read a patient-held summary (Blueprint §11: "verify a patient-carried, signed
 * summary offline and see who issued it and when"). The signature is checked on
 * this device against the cached Trust Registry, so it works when the issuing
 * system, or the network, is down. Canon Rule 9: it is advisory, and says so.
 */
const VERDICT: Record<Verdict, { title: string; body: string; tone: string; Icon: typeof ShieldCheck }> = {
  valid: { title: "Signature verified", body: "Issued by a registered institution and unchanged since it was signed.", tone: "bg-positive-tint text-positive", Icon: ShieldCheck },
  tampered: { title: "Signature doesn’t match", body: "The content was changed after signing. Don’t rely on it.", tone: "bg-critical-tint text-critical", Icon: ShieldX },
  "unknown-issuer": { title: "Unknown issuer", body: "The signer isn’t in the Trust Registry. Sync the registry; if it persists, don’t rely on it.", tone: "bg-critical-tint text-critical", Icon: ShieldAlert },
  revoked: { title: "Revoked by the issuer", body: "The issuing institution withdrew this summary. Ask the patient for a current one.", tone: "bg-critical-tint text-critical", Icon: ShieldX },
  "key-revoked": { title: "Signing key revoked", body: "The issuer’s key was compromised, so nothing it signed can be trusted.", tone: "bg-critical-tint text-critical", Icon: ShieldX },
  expired: { title: "Expired", body: "Past its validity date. It may be out of date; confirm with the issuer.", tone: "bg-warning-tint text-warning", Icon: AlertTriangle },
  malformed: { title: "Unreadable", body: "This isn’t a CLANCLAST summary code.", tone: "bg-critical-tint text-critical", Icon: ShieldX },
};

export default function VerifyView() {
  const [snap, setSnap] = useState<Snapshot | null>(cachedRegistry);
  const [syncing, setSyncing] = useState(false);
  const [regError, setRegError] = useState("");
  const [code, setCode] = useState("");
  const [camera, setCamera] = useState(false);
  const [result, setResult] = useState<Verification | null>(null);
  const [error, setError] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const canScan = typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;
  const [, tick] = useState(0);

  const sync = useCallback(async () => {
    setSyncing(true); setRegError("");
    try { setSnap(await syncRegistry()); } catch (e) { setRegError((e as Error).message); } finally { setSyncing(false); }
  }, []);
  useEffect(() => { sync(); input.current?.focus(); const t = setInterval(() => tick((n) => n + 1), 30_000); return () => clearInterval(t); }, [sync]);

  async function check(raw: string) {
    setError(""); setResult(null);
    const text = raw.trim().replace(/^.*#add=/, "");
    if (!text) return;
    if (!snap) { setError("The Trust Registry isn’t on this device yet. Connect once to download it."); return; }
    try { setResult(await verify(await unpack(text), snap.registry)); }
    catch { setResult({ verdict: "malformed" }); }
  }

  const p = result?.payload;
  const v = result ? VERDICT[result.verdict] : null;
  const age = snap ? Date.now() - snap.fetchedAt : 0;

  return (
    <>
      <div className="mb-5">
        <button onClick={() => navigate("summaries")} className="-ml-1.5 mb-1 inline-flex items-center gap-0.5 text-subhead font-medium text-accent"><ChevronLeft size={18} /> Summaries</button>
        <h1 className="large-title">Verify a summary</h1>
        <p className="mt-1 text-subhead text-ink-2">Checked on this device. Works when the issuer’s system, or your connection, is down.</p>
      </div>

      <div className="grid items-start gap-3 @5xl/app:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="grid gap-3">
          <section className="glass p-5">
            {camera && <CameraScanner onCode={(c) => { setCamera(false); setCode(c); check(c); }} onClose={() => setCamera(false)} />}
            {!camera && canScan && <button onClick={() => setCamera(true)} className="btn btn-quiet btn-block mb-3"><Camera size={16} /> Use the camera</button>}
            <form onSubmit={(e) => { e.preventDefault(); check(code); }}>
              <label className="field">
                <span className="field-label">Scan the code on the patient’s phone or card, or paste it</span>
                <textarea ref={input} className="input mono min-h-[96px] resize-y py-2.5 text-caption" value={code} onChange={(e) => setCode(e.target.value)} placeholder="CC2:…" spellCheck={false}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); check(code); } }} />
              </label>
              {error && <p role="alert" className="mt-3 text-footnote text-critical">{error}</p>}
              <button type="submit" disabled={!code.trim()} className="btn btn-primary btn-block mt-3">Verify</button>
            </form>
          </section>

          <section className={`glass flex items-start gap-3 p-4 ${snap?.offline ? "ring-1 ring-[var(--warning)]" : ""}`}>
            {snap?.offline ? <CloudOff size={18} className="mt-0.5 shrink-0 text-warning" /> : <ShieldCheck size={18} className="mt-0.5 shrink-0 text-accent" />}
            <div className="min-w-0 flex-1 text-footnote">
              <p className="font-semibold">{snap ? `Trust Registry ${snap.offline ? "saved" : "synced"} ${ago(snap.fetchedAt)}` : "Trust Registry not downloaded"}</p>
              <p className="text-ink-2">{snap ? `${snap.registry.issuers.length} issuers · ${snap.registry.revocations.length} revocations. ${snap.offline || age > 3_600_000 ? "Revocations made since then aren’t visible yet." : "Up to date."}` : regError || "Downloading…"}</p>
            </div>
            <button onClick={sync} disabled={syncing} aria-label="Sync registry" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-[var(--glass)]"><RefreshCw size={15} className={syncing ? "animate-spin" : ""} /></button>
          </section>
        </div>

        {result && v ? (
          <section className="glass enter min-w-0 overflow-hidden">
            <div className={`flex items-start gap-3 p-5 ${v.tone}`}>
              <v.Icon size={22} className="mt-0.5 shrink-0" />
              <div><p className="text-headline font-semibold">{v.title}</p><p className="text-footnote opacity-90">{v.body}</p></div>
            </div>
            {p && (
              <div className="p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-title-3 font-semibold">{p.vc.credentialSubject.name}</p>
                  <span className="mono text-footnote text-ink-2">{p.sub}</span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-footnote @xl/app:grid-cols-4">
                  <div><dt className="text-ink-2">Issuer</dt><dd className="font-semibold">{p.vc.issuer.name}</dd></div>
                  <div><dt className="text-ink-2">Version</dt><dd className="tnum font-semibold">Tier {p.vc.credentialSubject.tier} · v{p.vc.credentialSubject.version}</dd></div>
                  <div><dt className="text-ink-2">As of</dt><dd className="tnum font-semibold">{fmtDateTime(p.vc.credentialSubject.asOf)}</dd></div>
                  <div><dt className="text-ink-2">Expires</dt><dd className="tnum font-semibold">{fmtDate(p.exp * 1000)}</dd></div>
                </dl>
                {p.vc.synthetic && <p className="mt-3 rounded-[12px] bg-info-tint px-3 py-2 text-footnote text-info">Synthetic demonstration data. Not a real clinical record.</p>}
                <p className="mt-4 flex gap-2 rounded-[14px] bg-surface-2 px-3.5 py-2.5 text-footnote text-ink-2"><AlertTriangle size={16} className="mt-0.5 shrink-0" />Advisory: a snapshot as of the date above. Treat it as a lead and confirm with {p.vc.issuer.name} when they can be reached.</p>
                {(result.verdict === "valid" || result.verdict === "expired") && <div className="mt-5"><SummaryContentView c={p.vc.credentialSubject.content} tier={p.vc.credentialSubject.tier} /></div>}
              </div>
            )}
          </section>
        ) : (
          <section className="glass hidden min-h-[260px] flex-col items-center justify-center p-8 text-center @5xl/app:flex">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-tint text-accent"><ShieldCheck size={22} /></span>
            <p className="mt-3 text-callout font-semibold">The result appears here</p>
            <p className="mt-1 max-w-[40ch] text-footnote text-ink-2">Patients show it in their app under Share. The issuer, version and date are always shown with the content.</p>
          </section>
        )}
      </div>
    </>
  );
}
