import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { encode } from "uqr";
import { AlertTriangle, ArrowRight, Check, CreditCard, Eye, FlaskConical, IdCard, Minus, RefreshCw, Sun, Vault as VaultIcon } from "lucide-react";
import { patientApi } from "../../lib/api";
import { Sheet } from "../ui/Sheet";
import { navigate } from "../lib/router";
import { loadVault, useVault, type VaultItem } from "../vault/vault";
import { ago, fmtDate, fmtDateTime, TIERS, UnlockPanel, VERDICT } from "../vault/VaultView";
import { pack } from "../vault/qrcodec";
import { cachedRegistry, decodeSummary, syncRegistry, verifySummary, type RegistrySnapshot, type SummaryPayload, type Verification } from "../vault/verify";

/**
 * Share — selective presentation (Patient Rights: "Selective presentation").
 * The patient chooses what to show at each visit: identity only, Tier 1, or Tier 2.
 * Summary QR codes are generated on-device from the signed document, so they work
 * with no network; the verifier checks the issuer's signature against its cached registry.
 */

type Mode = "identity" | 1 | 2;

/** Which fields each choice discloses — shown beside the code so consent is informed. */
const DISCLOSES: { label: string; tiers: Mode[] }[] = [
  { label: "Name and CLANCLAST ID", tiers: ["identity", 1, 2] },
  { label: "Allergies and alerts", tiers: [1, 2] },
  { label: "Chronic conditions", tiers: [1, 2] },
  { label: "Current medication", tiers: [1, 2] },
  { label: "Blood group", tiers: [1, 2] },
  { label: "Recent diagnoses and procedures", tiers: [2] },
  { label: "Key results", tiers: [2] },
  { label: "Active referrals", tiers: [2] },
];


export default function ShareView({ patientId, name }: { patientId?: string; name?: string }) {
  // Deep link: /share?tier=1 opens straight onto the emergency summary.
  const [mode, setMode] = useState<Mode>(() => {
    const t = new URLSearchParams(window.location.search).get("tier");
    return t === "1" ? 1 : t === "2" ? 2 : "identity";
  });
  useEffect(() => { if (patientId) loadVault(patientId); }, [patientId]);

  return (
    <>
      <div className="mb-5">
        <h1 className="large-title">Share</h1>
        <p className="mt-1 text-subhead text-ink-2">Choose what the person in front of you can see.</p>
      </div>

      <Segmented value={mode} onChange={setMode} />

      <div className="mt-4 grid gap-4 @3xl/app:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] @3xl/app:items-start">
        {mode === "identity" ? <IdentityCode name={name} patientId={patientId} /> : <SummaryCode tier={mode} />}
        <Disclosure mode={mode} />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ segmented control */

function Segmented({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  const opts: { v: Mode; label: string }[] = [
    { v: "identity", label: "Identity" },
    { v: 1, label: "Emergency" },
    { v: 2, label: "Continuity" },
  ];
  const idx = opts.findIndex((o) => o.v === value);
  return (
    <div role="radiogroup" aria-label="What to share" className="glass relative grid grid-cols-3 !rounded-[18px] p-1">
      <i
        aria-hidden="true"
        className="absolute bottom-1 left-1 top-1 w-[calc((100%-8px)/3)] rounded-[14px] bg-[var(--surface)] shadow-[0_1px_2px_rgb(7_43_39/0.06),0_4px_12px_-6px_rgb(7_43_39/0.18)] transition-transform duration-500 ease-spring"
        style={{ transform: `translateX(${idx * 100}%)` }}
      />
      {opts.map((o) => (
        <button
          key={String(o.v)} role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)}
          className={`relative z-10 h-10 rounded-[14px] text-subhead font-semibold transition-colors duration-200 ${value === o.v ? "text-ink" : "text-ink-2"}`}
        >
          {o.label}
          {o.v !== "identity" && <span className="tnum ml-1 text-caption font-medium text-ink-3">T{o.v}</span>}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ QR rendering */

/** Crisp SVG QR (one path, merged runs) — scales to any screen without blur. */
const QrSvg = memo(function QrSvg({ text, label }: { text: string; label: string }) {
  const { d, size } = useMemo(() => {
    const qr = encode(text, { ecc: "L", border: 0 });
    let path = "";
    qr.data.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        if (!row[x]) { x++; continue; }
        let w = 1;
        while (x + w < row.length && row[x + w]) w++;
        path += `M${x} ${y}h${w}v1h-${w}z`;
        x += w;
      }
    });
    return { d: path, size: qr.size };
  }, [text]);
  return (
    <svg viewBox={`-2 -2 ${size + 4} ${size + 4}`} role="img" aria-label={label} className="aspect-square w-full" shapeRendering="crispEdges">
      <rect x="-2" y="-2" width={size + 4} height={size + 4} fill="#fff" />
      <path d={d} fill="#072b27" />
    </svg>
  );
});

function CodeCard({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section className="glass enter-fade p-5">
      {children}
      {footer && <div className="mt-4 flex items-center justify-center gap-1.5 text-footnote text-ink-2">{footer}</div>}
    </section>
  );
}

/* ------------------------------------------------------------------ identity (Tier 0) */

function IdentityCode({ name, patientId }: { name?: string; patientId?: string }) {
  const [payload, setPayload] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState(0);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [downloading, setDownloading] = useState(false);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const q = await patientApi.qr();
      setPayload(JSON.stringify({ humanetId: q.humanetId, token: q.qrToken }));
      setExpiresAt(Date.now() + q.expiresInSeconds * 1000);
    } catch {
      setError("Couldn't refresh your code. Check your connection.");
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  // Refresh 30 s before the server token expires so the code on screen is always valid.
  useEffect(() => { if (expiresAt && expiresAt - now < 30_000) refresh(); }, [now, expiresAt, refresh]);

  const left = Math.max(0, Math.round((expiresAt - now) / 1000));
  return (
    <CodeCard footer={payload ? <><RefreshCw size={13} /> <span className="tnum">Refreshes in {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</span></> : undefined}>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-accent-tint text-accent"><IdCard size={20} /></span>
        <div className="min-w-0">
          <p className="truncate text-headline font-semibold">{name || " "}</p>
          <p className="mono truncate text-footnote text-ink-2">{patientId || " "}</p>
        </div>
      </div>
      <div className="mx-auto mt-5 w-full max-w-[280px] overflow-hidden rounded-[20px] bg-white p-3">
        {payload ? <QrSvg text={payload} label="Your CLANCLAST ID code" /> : <div className={`aspect-square ${error ? "grid place-items-center text-center text-footnote text-critical" : "skeleton !rounded-[12px]"}`}>{error}</div>}
      </div>
      <p className="mt-4 text-center text-footnote text-ink-2">Lets a provider find you and send a consent request. It shows no health information.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={refresh} className="btn btn-quiet"><RefreshCw size={16} /> New code</button>
        <button
          disabled={downloading || !patientId}
          onClick={async () => { setDownloading(true); try { await patientApi.downloadHealthCard(patientId!); } finally { setDownloading(false); } }}
          className="btn btn-quiet"
        ><CreditCard size={16} /> {downloading ? "Preparing…" : "Health card"}</button>
      </div>
    </CodeCard>
  );
}

/* ------------------------------------------------------------------ signed summary (Tier 1/2) */

function SummaryCode({ tier }: { tier: 1 | 2 }) {
  const vault = useVault();
  const [snap, setSnap] = useState<RegistrySnapshot | null>(cachedRegistry);
  const [preview, setPreview] = useState(false);
  useEffect(() => { syncRegistry().then(setSnap).catch(() => {}); }, []);

  if (vault.status === "loading") return <section className="glass skeleton h-[420px]" />;
  if (vault.status === "absent") return <EmptyVault title="Set up your vault first" body="Summaries you share come from your vault, where they're kept encrypted on this device." />;
  if (vault.status === "locked") return <UnlockPanel biometric={vault.biometric} lockedUntil={vault.lockedUntil} fails={vault.fails} title="Unlock to share a summary" />;

  // Newest valid summary of this tier.
  const candidates = vault.items
    .map((i) => ({ item: i, d: decodeSummary(i.jws) }))
    .filter((x): x is { item: VaultItem; d: NonNullable<ReturnType<typeof decodeSummary>> } => !!x.d && x.d.payload.vc.credentialSubject.tier === tier)
    .sort((a, b) => b.d.payload.iat - a.d.payload.iat);
  const chosen = candidates[0];
  if (!chosen) return <EmptyVault title={`No ${TIERS[tier].name.toLowerCase()} yet`} body={`Add a ${TIERS[tier].short} summary to your vault to share it here.`} />;

  return <SummaryQr item={chosen.item} payload={chosen.d.payload} snap={snap} preview={preview} setPreview={setPreview} />;
}

function SummaryQr({ item, payload, snap, preview, setPreview }: { item: VaultItem; payload: SummaryPayload; snap: RegistrySnapshot | null; preview: boolean; setPreview: (v: boolean) => void }) {
  const [result, setResult] = useState<Verification | null>(null);
  const [packed, setPacked] = useState<string | null>(null);
  useEffect(() => { if (snap) verifySummary(item.jws, snap.registry).then(setResult); }, [item.jws, snap]);
  useEffect(() => { let live = true; pack(item.jws).then((t) => live && setPacked(t)); return () => { live = false; }; }, [item.jws]);
  const subj = payload.vc.credentialSubject;
  const tier = subj.tier;
  const blocked = result && result.verdict !== "valid";

  return (
    <CodeCard footer={<><Sun size={13} /> Turn up your brightness for scanning</>}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-caption font-semibold text-ink-2">{payload.vc.issuer.name}</span>
            {payload.vc.synthetic && <span className="badge h-5 bg-info-tint px-1.5 text-info">SYNTHETIC</span>}
          </span>
          <p className="text-headline font-semibold">{TIERS[tier].name}</p>
          <p className="tnum text-footnote text-ink-2">v{subj.version} · as of {fmtDate(subj.asOf)} · expires {fmtDate(payload.exp * 1000)}</p>
        </div>
        {result && <span className={`badge h-6 shrink-0 ${VERDICT[result.verdict].tone}`}>{VERDICT[result.verdict].label}</span>}
      </div>

      {blocked ? (
        <div className="mt-5 flex items-start gap-2.5 rounded-[16px] bg-critical-tint p-4 text-footnote text-critical">
          <AlertTriangle size={16} className="mt-px shrink-0" />
          <p>This summary is <b>{VERDICT[result!.verdict].label.toLowerCase()}</b>, so it isn't shown for sharing. Ask your clinic for a new one.</p>
        </div>
      ) : (
        <div className="-mx-2 mt-4 overflow-hidden rounded-[20px] bg-white p-2 @3xl/app:mx-auto @3xl/app:max-w-[420px]">
          {packed ? <QrSvg text={packed} label={`Signed ${TIERS[tier].name}`} /> : <div className="skeleton aspect-square !rounded-[12px]" />}
        </div>
      )}

      <button onClick={() => setPreview(true)} className="btn btn-secondary btn-block mt-4"><Eye size={17} /> Preview as a clinician</button>
      {preview && <ClinicianPreview payload={payload} result={result} snap={snap} close={() => setPreview(false)} />}
    </CodeCard>
  );
}

function EmptyVault({ title, body }: { title: string; body: string }) {
  return (
    <section className="glass-tint p-6 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-[16px] bg-white/80 text-accent"><VaultIcon size={22} strokeWidth={1.8} /></span>
      <p className="mt-4 text-headline font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-[320px] text-footnote text-ink-2">{body}</p>
      <button onClick={() => navigate("vault")} className="btn btn-primary mx-auto mt-5">Open vault <ArrowRight size={16} /></button>
    </section>
  );
}

/* ------------------------------------------------------------------ disclosure list */

function Disclosure({ mode }: { mode: Mode }) {
  return (
    <section className="glass p-5">
      <p className="eyebrow">They will see</p>
      <ul className="mt-2 space-y-1.5">
        {DISCLOSES.map((f) => {
          const on = f.tiers.includes(mode);
          return (
            <li key={f.label} className={`flex items-center gap-2.5 text-callout transition-colors duration-200 ${on ? "text-ink" : "text-ink-3"}`}>
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full transition-colors duration-200 ${on ? "bg-accent text-on-accent" : "bg-surface-2"}`}>
                {on ? <Check size={12} strokeWidth={3} /> : <Minus size={12} strokeWidth={3} />}
              </span>
              <span className={on ? "" : "line-through decoration-[var(--ink-3)]/40"}>{f.label}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 border-t border-hairline pt-3 text-footnote text-ink-2">
        {mode === "identity"
          ? "No health information is shared. A provider who needs more must send a consent request you approve."
          : "Shown only to whoever scans it now. Nothing is sent to CLANCLAST, and you can revoke the summary from your vault at any time."}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ verifier preview */

function ClinicianPreview({ payload, result, snap, close }: { payload: SummaryPayload; result: Verification | null; snap: RegistrySnapshot | null; close: () => void }) {
  const subj = payload.vc.credentialSubject;
  const c = subj.content;
  const ok = result?.verdict === "valid";
  return (
    <Sheet title="What the clinician sees" close={close}>
      <div className={`flex items-center gap-3 rounded-[18px] p-4 ${ok ? "bg-positive-tint text-positive" : "bg-critical-tint text-critical"}`}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/70">{ok ? <Check size={20} strokeWidth={2.6} /> : <AlertTriangle size={20} />}</span>
        <div>
          <p className="text-callout font-semibold">{result ? VERDICT[result.verdict].label : "Checking…"}</p>
          <p className="text-footnote opacity-80">Signed by {payload.vc.issuer.name}{payload.vc.synthetic ? " (synthetic)" : ""} · registry {snap ? ago(snap.fetchedAt) : "—"}</p>
        </div>
      </div>
      <div className="mt-3 flex items-start gap-2.5 rounded-[16px] bg-warning-tint px-3.5 py-3 text-footnote text-warning">
        <AlertTriangle size={16} className="mt-px shrink-0" />
        <p><b className="font-semibold">Advisory. Snapshot as of {fmtDateTime(subj.asOf)}.</b> Confirm with {payload.vc.issuer.name} when reachable.</p>
      </div>
      {payload.vc.synthetic && <p className="mt-2 flex items-center gap-2 rounded-[16px] bg-info-tint px-3.5 py-2.5 text-footnote text-info"><FlaskConical size={15} /> Synthetic demonstration data</p>}
      <div className="list-group mt-4 text-callout">
        <PreviewRow k="Patient" v={<>{subj.name} <span className="mono text-footnote text-ink-2">{subj.id}</span></>} />
        <PreviewRow k="Blood group" v={<b className="tnum">{c.bloodGroup}</b>} />
        <PreviewRow k="Allergies" v={c.allergies?.join(", ")} />
        <PreviewRow k="Conditions" v={c.chronicConditions?.join(", ")} />
        <PreviewRow k="Medication" v={c.currentMedication?.join(", ")} />
        <PreviewRow k="Alerts" v={c.alerts?.join(", ")} />
        {subj.tier === 2 && <>
          <PreviewRow k="Diagnoses" v={c.recentDiagnoses?.join(", ")} />
          <PreviewRow k="Procedures" v={c.procedures?.join(", ")} />
          <PreviewRow k="Results" v={c.keyResults?.map((r) => `${r.name} ${r.value} ${r.unit}`).join(" · ")} />
          <PreviewRow k="Referrals" v={c.activeReferrals?.join(", ")} />
        </>}
      </div>
      <p className="mt-3 text-center text-caption text-ink-2">{TIERS[subj.tier].short} · version {subj.version} · issued {fmtDate(payload.iat * 1000)} · expires {fmtDate(payload.exp * 1000)}</p>
    </Sheet>
  );
}

function PreviewRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 px-4 py-2.5">
      <span className="w-24 shrink-0 text-footnote text-ink-2">{k}</span>
      <span className="min-w-0 flex-1">{v || <span className="text-ink-3">None recorded</span>}</span>
    </div>
  );
}
