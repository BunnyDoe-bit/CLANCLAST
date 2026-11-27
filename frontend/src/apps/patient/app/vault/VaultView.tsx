import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle, ArrowRight, Check, CloudOff, Fingerprint, FlaskConical, KeyRound, Lock, LockKeyhole, Plus, RefreshCw,
  ScanFace, ShieldAlert, ShieldCheck, ShieldX, Smartphone, Trash2, X,
} from "lucide-react";
import { ApiError, trustApi } from "../../lib/api";
import { Sheet } from "../ui/Sheet";
import { BrandWeave } from "../brand/BrandWeave";
import { PinPad } from "./PinPad";
import {
  addItem, biometricAvailable, createVault, disableBiometric, enableBiometric, eraseVault, loadVault, lock, removeItem,
  unlockWithBiometric, unlockWithPin, useVault, type VaultItem,
} from "./vault";
import { clearIncoming, onIncomingChange, peekIncoming } from "./incoming";
import { unpack } from "./qrcodec";
import { cachedRegistry, decodeSummary, syncRegistry, tamper, verifySummary, type RegistrySnapshot, type SummaryPayload, type Verdict, type Verification } from "./verify";

/* ------------------------------------------------------------------ formatting */

export { fmtDate, fmtDateTime, ago } from "../lib/format";
import { fmtDate, fmtDateTime, ago } from "../lib/format";

export const TIERS = {
  1: { name: "Emergency summary", short: "Tier 1", detail: "Allergies, chronic conditions, current medication, blood group and alerts." },
  2: { name: "Continuity summary", short: "Tier 2", detail: "Everything in Tier 1, plus recent diagnoses, procedures, key results and referrals." },
} as const;

export const VERDICT: Record<Verdict, { label: string; tone: string; Icon: typeof ShieldCheck }> = {
  valid: { label: "Signature verified", tone: "bg-positive-tint text-positive", Icon: ShieldCheck },
  tampered: { label: "Signature invalid", tone: "bg-critical-tint text-critical", Icon: ShieldX },
  "unknown-issuer": { label: "Unknown issuer", tone: "bg-critical-tint text-critical", Icon: ShieldAlert },
  revoked: { label: "Revoked", tone: "bg-critical-tint text-critical", Icon: ShieldX },
  expired: { label: "Expired", tone: "bg-warning-tint text-warning", Icon: AlertTriangle },
  malformed: { label: "Unreadable", tone: "bg-critical-tint text-critical", Icon: ShieldX },
};

const isApple = typeof navigator !== "undefined" && /iPhone|iPad|Macintosh/.test(navigator.userAgent);
const BIO = isApple ? { name: "Face ID", Icon: ScanFace } : { name: "fingerprint", Icon: Fingerprint };

/* ------------------------------------------------------------------ view */

export default function VaultView({ patientId, name }: { patientId?: string; name?: string }) {
  const vault = useVault();
  useEffect(() => { if (patientId) loadVault(patientId); }, [patientId]);

  if (!patientId || vault.status === "loading") return <VaultSkeleton />;
  if (vault.status === "absent") return <Setup name={name} />;
  if (vault.status === "locked") return <LockScreen biometric={vault.biometric} lockedUntil={vault.lockedUntil} fails={vault.fails} />;
  return <Unlocked items={vault.items} biometric={vault.biometric} name={name} owner={patientId} />;
}

function VaultSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading vault">
      <div className="skeleton h-10 w-32" />
      <div className="skeleton mt-2 h-5 w-64" />
      <div className="skeleton mt-6 h-[188px] !rounded-[var(--radius-card)]" />
      <div className="skeleton mt-3 h-[112px] !rounded-[var(--radius-card)]" />
    </div>
  );
}

function PageTitle({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="large-title">{title}</h1>
        {sub && <div className="mt-1 text-subhead text-ink-2">{sub}</div>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ setup */

// Set during setup; the unlocked view offers biometric enrolment exactly once.
let offerBiometricOnce = false;

function Setup(_: { name?: string }) {
  const [step, setStep] = useState<"intro" | "create" | "confirm">("intro");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const first = useRef("");

  if (step === "intro") {
    return (
      <>
        <PageTitle title="Vault" sub="Signed summaries, kept only on this device." />
        <section className="hero p-6">
          <BrandWeave preset="card" scrim="even" />
          <div className="relative z-10">
          <span className="grid h-12 w-12 place-items-center rounded-[16px] bg-white/10 text-[var(--brand-300)]"><LockKeyhole size={24} strokeWidth={1.8} /></span>
          <h2 className="mt-5 text-title-2 font-semibold !text-white">Set up your vault</h2>
          <p className="mt-2 text-callout text-white/70">
            Your clinics sign summaries of your health information. They are stored here, encrypted, so you can show them when the network or the clinic's system is down.
          </p>
          <button onClick={() => setStep("create")} className="btn btn-inverse btn-lg btn-block mt-6">Create a vault PIN</button>
          </div>
        </section>
        <ul className="glass mt-3 divide-y divide-[var(--hairline)]">
          <Point Icon={Smartphone} title="Encrypted on this device" body="CLANCLAST never receives or stores the contents." />
          <Point Icon={KeyRound} title={`Unlock with a PIN or ${BIO.name}`} body={`Your ${BIO.name} data stays on your phone.`} />
          <Point Icon={ShieldCheck} title="Checked offline" body="Anyone you show it to can confirm it came from your clinic and was not changed." />
        </ul>
      </>
    );
  }

  return (
    <div className="glass mx-auto max-w-[420px] px-5 py-8">
      <PinPad
        key={`${step}-${attempt}`}
        title={step === "create" ? "Create a 6-digit PIN" : "Confirm your PIN"}
        hint={step === "create" ? "Avoid birthdays and repeated digits." : "Enter the same PIN again."}
        error={error}
        busy={busy}
        onComplete={async (pin) => {
          if (step === "create") {
            if (/^(\d)\1+$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin)) {
              setError("That PIN is too easy to guess."); setAttempt((a) => a + 1); return;
            }
            first.current = pin; setError(""); setStep("confirm"); return;
          }
          if (pin !== first.current) { setError("The PINs didn't match. Start again."); first.current = ""; setStep("create"); setAttempt((a) => a + 1); return; }
          setBusy(true);
          offerBiometricOnce = await biometricAvailable();
          first.current = "";
          await createVault(pin); // unlocks → this component unmounts
        }}
      />
    </div>
  );
}

function Point({ Icon, title, body }: { Icon: typeof Lock; title: string; body: string }) {
  return (
    <li className="flex gap-3.5 p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-accent-tint text-accent"><Icon size={18} strokeWidth={1.9} /></span>
      <div>
        <p className="text-callout font-semibold">{title}</p>
        <p className="text-footnote text-ink-2">{body}</p>
      </div>
    </li>
  );
}

function EnrolBiometric({ name, onDone }: { name?: string; onDone: () => void }) {
  // Shown once right after setup, over the (already unlocked) vault.
  const [msg, setMsg] = useState("");
  return (
    <Sheet title={`Unlock with ${BIO.name}?`} close={onDone}>
      <div className="grid place-items-center py-4 text-accent"><BIO.Icon size={56} strokeWidth={1.4} /></div>
      <p className="text-callout text-ink-2">Open your vault with {BIO.name} instead of typing your PIN. Your {BIO.name} data never leaves this device. Your PIN still works.</p>
      {msg && <p className="mt-3 rounded-[14px] bg-warning-tint px-3 py-2.5 text-footnote text-warning">{msg}</p>}
      <div className="mt-6 grid gap-2">
        <button
          className="btn btn-primary btn-lg btn-block"
          onClick={async () => {
            const r = await enableBiometric(name || "CLANCLAST patient");
            if (r.ok) { onDone(); return; }
            setMsg(r.reason === "unsupported" ? `This browser can't protect the vault with ${BIO.name} yet. Your PIN keeps it secure.` : "Cancelled. You can turn this on later in vault settings.");
          }}
        >Turn on {BIO.name}</button>
        <button className="btn btn-quiet btn-lg btn-block" onClick={onDone}>Not now</button>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ locked */

function LockScreen({ biometric, lockedUntil, fails }: { biometric: boolean; lockedUntil: number; fails: number }) {
  return (
    <>
      <PageTitle title="Vault" sub={<span className="inline-flex items-center gap-1.5"><Lock size={14} strokeWidth={2.2} /> Locked</span>} />
      <UnlockPanel biometric={biometric} lockedUntil={lockedUntil} fails={fails} />
    </>
  );
}

/** PIN pad + biometric button. Shared by the Vault and Share screens. */
export function UnlockPanel({ biometric, lockedUntil, fails, title = "Enter your vault PIN" }: { biometric: boolean; lockedUntil: number; fails: number; title?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const throttled = lockedUntil > now;

  useEffect(() => {
    if (!throttled) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [throttled]);

  const tryBio = useCallback(async () => {
    setError("");
    const r = await unlockWithBiometric();
    if (!r.ok && r.reason === "unsupported") setError(`${BIO.name} isn't available. Use your PIN.`);
  }, []);

  const wait = Math.ceil((lockedUntil - now) / 1000);
  return (
    <div className="glass mx-auto max-w-[420px] px-5 py-8">
      <PinPad
        key={attempt}
        title={title}
        hint={throttled ? `Too many attempts. Try again in ${wait} s.` : fails > 0 ? `${Math.max(0, 5 - fails)} attempts before a delay` : "Your PIN unlocks the vault on this device only."}
        error={error}
        busy={busy}
        disabled={throttled}
        aux={biometric ? (
          <button onClick={tryBio} aria-label={`Unlock with ${BIO.name}`} className="grid h-[72px] w-[72px] place-items-center rounded-full text-accent transition-transform duration-100 ease-spring active:scale-90">
            <BIO.Icon size={30} strokeWidth={1.6} />
          </button>
        ) : undefined}
        onComplete={async (pin) => {
          setBusy(true);
          const r = await unlockWithPin(pin);
          setBusy(false);
          if (!r.ok) {
            setError(r.reason === "throttled" ? "Too many attempts." : r.attemptsLeft ? `Wrong PIN. ${r.attemptsLeft} attempt${r.attemptsLeft === 1 ? "" : "s"} left.` : "Wrong PIN.");
            setAttempt((a) => a + 1);
            setNow(Date.now());
          }
        }}
      />
      {biometric && !throttled && (
        <button onClick={tryBio} className="btn btn-plain mx-auto mt-6 flex"><BIO.Icon size={18} /> Use {BIO.name}</button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ unlocked */

type Pending = { tier: 1 | 2; error?: string };

function Unlocked({ items, biometric, name, owner }: { items: VaultItem[]; biometric: boolean; name?: string; owner: string }) {
  const [snap, setSnap] = useState<RegistrySnapshot | null>(cachedRegistry);
  const [syncing, setSyncing] = useState(false);
  const [registryError, setRegistryError] = useState("");
  const [results, setResults] = useState<Record<string, Verification>>({});
  const [pending, setPending] = useState<Pending | null>(null);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [offerBio, setOfferBio] = useState(() => { const v = offerBiometricOnce; offerBiometricOnce = false; return v; });
  const [, tick] = useState(0);

  const sync = useCallback(async () => {
    setSyncing(true); setRegistryError("");
    try { setSnap(await syncRegistry()); } catch (e) { setRegistryError((e as Error).message); } finally { setSyncing(false); }
  }, []);
  useEffect(() => { sync(); }, [sync]);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30_000); return () => clearInterval(t); }, []);

  // Verify every summary against the current registry snapshot (pure, fast, offline).
  useEffect(() => {
    if (!snap) return;
    let live = true;
    Promise.all(items.map(async (i) => [i.id, await verifySummary(i.jws, snap.registry)] as const)).then((pairs) => {
      if (live) setResults(Object.fromEntries(pairs));
    });
    return () => { live = false; };
  }, [items, snap]);

  async function issue(tier: 1 | 2) {
    setAdding(false);
    setPending({ tier }); // optimistic placeholder in the exact geometry of a card
    try {
      const s = await trustApi.issueSynthetic(tier);
      await addItem({ id: s.id, jws: s.jws, addedAt: new Date().toISOString() });
      setPending(null);
    } catch (e) {
      setPending({ tier, error: e instanceof ApiError ? e.message : "The issuer couldn't be reached. Try again when you're online." });
    }
  }

  const open = items.find((i) => i.id === openId);

  return (
    <>
      <PageTitle
        title="Vault"
        sub={<span className="inline-flex items-center gap-1.5 text-positive"><span className="h-1.5 w-1.5 rounded-full bg-current" /> Unlocked · locks after 5 min idle</span>}
        action={
          <button onClick={lock} className="glass-float press inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-footnote font-semibold">
            <Lock size={15} strokeWidth={2.2} /> Lock
          </button>
        }
      />

      <RegistryStatus snap={snap} syncing={syncing} error={registryError} onSync={sync} />

      <IncomingSummary owner={owner} snap={snap} items={items} />

      <div className="mt-3 grid gap-3 @2xl/app:grid-cols-2">
        {pending && <PendingCard pending={pending} onRetry={() => issue(pending.tier)} onDismiss={() => setPending(null)} />}
        {items.map((item) => <SummaryCard key={item.id} item={item} result={results[item.id]} onOpen={() => setOpenId(item.id)} />)}
      </div>

      {items.length === 0 && !pending && (
        <section className="glass-tint mt-3 p-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-[16px] bg-white/80 text-accent"><ShieldCheck size={24} strokeWidth={1.8} /></span>
          <p className="mt-4 text-headline font-semibold">No summaries yet</p>
          <p className="mx-auto mt-1 max-w-[320px] text-footnote text-ink-2">When a clinic issues you a signed summary, scan the code on their screen with your phone camera and it lands here. You can add a synthetic one to see how it works.</p>
        </section>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button onClick={() => setAdding(true)} disabled={!!pending && !pending.error} className="btn btn-primary btn-lg"><Plus size={18} strokeWidth={2.4} /> Add summary</button>
        <button onClick={() => setSettings(true)} className="btn btn-quiet btn-lg"><KeyRound size={17} /> Vault settings</button>
      </div>

      {adding && (
        <Sheet title="Add a summary" close={() => setAdding(false)}>
          <p className="-mt-1 mb-4 flex items-start gap-2 rounded-[14px] bg-info-tint px-3 py-2.5 text-footnote text-info">
            <FlaskConical size={16} className="mt-px shrink-0" />
            Issued by Synthetic Demo Hospital. The values are synthetic, for demonstration only. No real clinic is involved yet.
          </p>
          <div className="grid gap-2.5">
            {([1, 2] as const).map((t) => (
              <button key={t} onClick={() => issue(t)} className="glass press flex items-center gap-3.5 p-4 text-left">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-accent-tint text-callout font-bold text-accent tnum">{t}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-callout font-semibold">{TIERS[t].name}</span>
                  <span className="block text-footnote text-ink-2">{TIERS[t].detail}</span>
                </span>
                <span className="chev"><ArrowRight size={15} strokeWidth={2.2} /></span>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {open && <SummaryDetail item={open} result={results[open.id]} snap={snap} onResync={sync} close={() => setOpenId(null)} />}
      {offerBio && <EnrolBiometric name={name} onDone={() => setOfferBio(false)} />}
      {settings && <VaultSettings biometric={biometric} name={name} close={() => setSettings(false)} />}
    </>
  );
}

function RegistryStatus({ snap, syncing, error, onSync }: { snap: RegistrySnapshot | null; syncing: boolean; error: string; onSync: () => void }) {
  const stale = snap && Date.now() - snap.fetchedAt > 24 * 3600_000;
  return (
    <div className={`flex items-center gap-2.5 rounded-[16px] px-3.5 py-2.5 text-footnote ${error || stale ? "bg-warning-tint text-warning" : "glass !rounded-[16px] text-ink-2"}`}>
      {snap?.offline ? <CloudOff size={15} className="shrink-0" /> : <ShieldCheck size={15} className="shrink-0 text-accent" />}
      <span className="min-w-0 flex-1">
        {error && !snap ? error : (
          <>Trust registry {snap?.offline ? "(offline copy) " : ""}updated <b className="tnum font-semibold">{snap ? ago(snap.fetchedAt) : "—"}</b>
            {snap?.offline ? ". Revocations after this time aren't visible yet." : ""}</>
        )}
      </span>
      <button onClick={onSync} aria-label="Refresh trust registry" className="-my-1 -mr-1.5 grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--glass)]">
        <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
      </button>
    </div>
  );
}

function VerdictPill({ result }: { result?: Verification }) {
  if (!result) return <span className="skeleton inline-block h-6 w-32 !rounded-full" />;
  const v = VERDICT[result.verdict];
  return <span className={`badge h-6 ${v.tone}`}><v.Icon size={13} strokeWidth={2.4} />{v.label}</span>;
}

function SummaryCard({ item, result, onOpen }: { item: VaultItem; result?: Verification; onOpen: () => void }) {
  const decoded = useMemo(() => decodeSummary(item.jws), [item.jws]);
  const p = decoded?.payload;
  const subj = p?.vc.credentialSubject;
  const tier = (subj?.tier ?? 1) as 1 | 2;
  return (
    <button onClick={onOpen} className="glass press flex min-h-[148px] flex-col p-4 text-left">
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-caption font-semibold text-ink-2">{p?.vc.issuer.name ?? "Unknown issuer"}</span>
            {p?.vc.synthetic && <span className="badge h-5 bg-info-tint px-1.5 text-info">SYNTHETIC</span>}
          </span>
          <span className="mt-0.5 block text-headline font-semibold">{TIERS[tier].name}</span>
        </span>
        <span className="chev"><ArrowRight size={15} strokeWidth={2.2} /></span>
      </span>
      <span className="tnum mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-footnote text-ink-2">
        <span>{TIERS[tier].short} · v{subj?.version ?? "?"}</span>
        {subj && <span>As of {fmtDate(subj.asOf)}</span>}
        {p && <span>Expires {fmtDate(p.exp * 1000)}</span>}
      </span>
      <span className="mt-auto pt-3"><VerdictPill result={result} /></span>
    </button>
  );
}

function PendingCard({ pending, onRetry, onDismiss }: { pending: Pending; onRetry: () => void; onDismiss: () => void }) {
  return (
    <div className="glass flex min-h-[148px] flex-col p-4" aria-live="polite">
      <span className="text-caption font-semibold text-ink-2">Synthetic Demo Hospital</span>
      <span className="mt-0.5 text-headline font-semibold">{TIERS[pending.tier].name}</span>
      {pending.error ? (
        <>
          <p className="mt-2 text-footnote text-critical">{pending.error}</p>
          <span className="mt-auto flex gap-2 pt-3">
            <button onClick={onRetry} className="btn btn-secondary min-h-9 px-3 text-footnote">Try again</button>
            <button onClick={onDismiss} className="btn btn-plain min-h-9 text-footnote">Dismiss</button>
          </span>
        </>
      ) : (
        <>
          <span className="skeleton mt-3 h-4 w-48" />
          <span className="mt-auto inline-flex items-center gap-2 pt-3 text-footnote text-ink-2">
            <RefreshCw size={14} className="animate-spin" /> Requesting signature and encrypting…
          </span>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ detail */

function SummaryDetail({ item, result, snap, onResync, close }: { item: VaultItem; result?: Verification; snap: RegistrySnapshot | null; onResync: () => Promise<void>; close: () => void }) {
  const decoded = useMemo(() => decodeSummary(item.jws), [item.jws]);
  const p = decoded?.payload as SummaryPayload | undefined;
  const subj = p?.vc.credentialSubject;
  const tier = (subj?.tier ?? 1) as 1 | 2;
  const [tamperResult, setTamperResult] = useState<{ field: string; from: string; to: string; verdict: Verdict } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [optimisticRevoked, setOptimisticRevoked] = useState(false);

  const shown: Verification | undefined = optimisticRevoked && result ? { ...result, verdict: "revoked" } : result;

  async function runTamper() {
    if (!snap) return;
    const t = tamper(item.jws);
    const r = await verifySummary(t.jws, snap.registry);
    setTamperResult({ field: t.field, from: t.from, to: t.to, verdict: r.verdict });
  }

  async function revoke() {
    setBusy(true); setErr(""); setOptimisticRevoked(true); setConfirmRevoke(false);
    try { await trustApi.revoke(item.id, "LOST_DEVICE"); await onResync(); }
    catch (e) { setOptimisticRevoked(false); setErr(e instanceof ApiError ? e.message : "Couldn't reach CLANCLAST. Try again when online."); }
    finally { setBusy(false); }
  }

  if (!p || !subj) return <Sheet title="Unreadable summary" close={close}><p className="text-callout text-ink-2">This file isn't a CLANCLAST summary.</p></Sheet>;
  const c = subj.content;

  return (
    <Sheet title={TIERS[tier].name} close={close} wide>
      {/* Canon Rule 9 — advisory, every time */}
      <div className="flex items-start gap-2.5 rounded-[16px] bg-warning-tint px-3.5 py-3 text-footnote text-warning">
        <AlertTriangle size={16} className="mt-px shrink-0" />
        <p><b className="font-semibold">Snapshot as of {fmtDateTime(subj.asOf)}.</b> {p.vc.issuer.name} holds the authoritative record. Treat this as a lead and confirm with them when they can be reached.</p>
      </div>
      {p.vc.synthetic && (
        <p className="mt-2 flex items-center gap-2 rounded-[16px] bg-info-tint px-3.5 py-2.5 text-footnote text-info"><FlaskConical size={15} /> Synthetic data. Not a real patient record.</p>
      )}

      <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-4 rounded-[20px] bg-surface-2 p-4">
        <div>
          <p className="eyebrow">Blood group</p>
          <p className="tnum mt-0.5 text-[2.5rem] font-bold leading-none tracking-tight">{c.bloodGroup ?? "—"}</p>
        </div>
        <div className="min-w-0 border-l border-hairline pl-4">
          <p className="truncate text-callout font-semibold">{subj.name}</p>
          <p className="mono truncate text-caption text-ink-2">{subj.id}</p>
          <p className="tnum mt-1 text-caption text-ink-2">{TIERS[tier].short} · v{subj.version} · expires {fmtDate(p.exp * 1000)}</p>
        </div>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-4 @2xl/app:grid-cols-2">
        <Field label="Allergies" items={c.allergies} />
        <Field label="Chronic conditions" items={c.chronicConditions} />
        <Field label="Current medication" items={c.currentMedication} />
        <Field label="Alerts" items={c.alerts} />
        {tier === 2 && <>
          <Field label="Recent diagnoses" items={c.recentDiagnoses} />
          <Field label="Procedures" items={c.procedures} />
          <Field label="Active referrals" items={c.activeReferrals} />
          {c.keyResults && (
            <div>
              <dt className="eyebrow">Key results</dt>
              <dd className="mt-1.5 space-y-1">
                {c.keyResults.map((r) => (
                  <div key={r.name} className="flex justify-between gap-3 text-callout"><span>{r.name}</span><span className="tnum font-semibold">{r.value} <span className="font-normal text-ink-2">{r.unit}</span></span></div>
                ))}
              </dd>
            </div>
          )}
        </>}
      </dl>

      {/* Signature */}
      <section className="mt-6 overflow-hidden rounded-[20px] border border-hairline">
        <div className="flex items-center justify-between gap-3 bg-surface-2 px-4 py-3">
          <p className="text-callout font-semibold">Signature</p>
          <VerdictPill result={shown} />
        </div>
        <dl className="divide-y divide-[var(--hairline)] text-footnote">
          <Row k="Issuer" v={<>{p.vc.issuer.name}{shown?.issuer?.kind === "SYNTHETIC" && <span className="text-ink-2"> · synthetic</span>}</>} />
          <Row k="Algorithm" v="Ed25519 (EdDSA)" />
          <Row k="Key ID" v={<span className="mono">{decoded?.header?.kid}</span>} />
          <Row k="Signed" v={<span className="tnum">{fmtDateTime(p.iat * 1000)}</span>} />
          <Row k="Expires" v={<span className="tnum">{fmtDateTime(p.exp * 1000)}</span>} />
          <Row k="Summary ID" v={<span className="mono break-all">{p.jti.replace("urn:uuid:", "")}</span>} />
          <Row k="Checked against" v={<span className="tnum">Trust registry from {snap ? ago(snap.fetchedAt) : "—"}{snap?.offline ? " (offline)" : ""}</span>} />
          {shown?.verdict === "revoked" && <Row k="Revoked" v={<span className="tnum text-critical">{shown.revokedAt ? fmtDateTime(shown.revokedAt) : "just now"}</span>} />}
        </dl>
      </section>

      {/* Tamper test */}
      <section className="mt-3 rounded-[20px] border border-dashed border-hairline-strong p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-callout font-semibold">Tamper test</p>
            <p className="text-footnote text-ink-2">Edit one value without the issuer's key and check the signature again.</p>
          </div>
          <button onClick={runTamper} disabled={!snap} className="btn btn-secondary min-h-10 shrink-0 px-4 text-footnote">Run test</button>
        </div>
        {tamperResult && (
          <div className="enter mt-3 rounded-[14px] bg-surface-2 p-3 text-footnote">
            <p className="tnum">{tamperResult.field}: <b>{tamperResult.from}</b> → <b>{tamperResult.to}</b></p>
            <p className={`mt-1 flex items-center gap-1.5 font-semibold ${tamperResult.verdict === "tampered" ? "text-critical" : "text-positive"}`}>
              {tamperResult.verdict === "tampered" ? <><X size={15} strokeWidth={2.6} /> Signature check failed. The change is detected.</> : <><Check size={15} strokeWidth={2.6} /> {VERDICT[tamperResult.verdict].label}</>}
            </p>
            <p className="mt-1 text-ink-2">Your stored copy is unchanged.</p>
          </div>
        )}
      </section>

      {err && <p role="alert" className="mt-3 rounded-[14px] bg-critical-tint px-3 py-2.5 text-footnote text-critical">{err}</p>}

      <div className="mt-5 grid gap-2">
        {shown?.verdict !== "revoked" && (confirmRevoke ? (
          <div className="rounded-[18px] bg-critical-tint p-3.5">
            <p className="text-footnote text-critical"><b>Revoke this summary?</b> Verifiers will reject it as soon as they next sync. Use this if your phone or card is lost. Your clinic can issue a new one.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setConfirmRevoke(false)} className="btn btn-quiet">Cancel</button>
              <button onClick={revoke} disabled={busy} className="btn bg-critical text-white">Revoke</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmRevoke(true)} className="btn btn-destructive btn-block"><ShieldX size={17} /> Revoke (lost or compromised)</button>
        ))}
        <button onClick={async () => { await removeItem(item.id); close(); }} className="btn btn-plain btn-block text-ink-2"><Trash2 size={16} /> Remove from this device</button>
      </div>
    </Sheet>
  );
}

function Field({ label, items }: { label: string; items?: string[] }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 text-callout">{items?.length ? items.map((i) => <p key={i}>{i}</p>) : <span className="text-ink-3">None recorded</span>}</dd>
    </div>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <dt className="shrink-0 text-ink-2">{k}</dt>
      <dd className="min-w-0 text-right">{v}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ settings */

function VaultSettings({ biometric, name, close }: { biometric: boolean; name?: string; close: () => void }) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [msg, setMsg] = useState("");
  const [confirmErase, setConfirmErase] = useState(false);
  useEffect(() => { biometricAvailable().then(setAvailable); }, []);

  return (
    <Sheet title="Vault settings" close={close}>
      <div className="list-group">
        <div className="list-row">
          <BIO.Icon size={20} className="shrink-0 text-accent" />
          <span className="min-w-0 flex-1">
            <span className="block text-callout font-medium">Unlock with {BIO.name}</span>
            <span className="block text-footnote text-ink-2">{available === false && !biometric ? "Not supported on this device or browser" : "Stays on this device"}</span>
          </span>
          <Toggle
            on={biometric}
            disabled={available === false && !biometric}
            label={`Unlock with ${BIO.name}`}
            onChange={async (next) => {
              setMsg("");
              if (!next) return disableBiometric();
              const r = await enableBiometric(name || "CLANCLAST patient");
              if (!r.ok) setMsg(r.reason === "unsupported" ? `This browser can't protect the vault with ${BIO.name} yet.` : "Cancelled.");
            }}
          />
        </div>
        <div className="list-row">
          <Lock size={20} className="shrink-0 text-accent" />
          <span className="min-w-0 flex-1">
            <span className="block text-callout font-medium">Auto-lock</span>
            <span className="block text-footnote text-ink-2">After 5 minutes idle, or 30 seconds in the background</span>
          </span>
        </div>
      </div>
      {msg && <p className="mt-3 rounded-[14px] bg-warning-tint px-3 py-2.5 text-footnote text-warning">{msg}</p>}

      <div className="mt-5">
        {confirmErase ? (
          <div className="rounded-[18px] bg-critical-tint p-3.5">
            <p className="text-footnote text-critical"><b>Erase the vault from this device?</b> Every summary stored here is deleted. Use this on shared or handed-on phones. Summaries can be re-issued by your clinic.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setConfirmErase(false)} className="btn btn-quiet">Cancel</button>
              <button onClick={async () => { await eraseVault(); close(); }} className="btn bg-critical text-white">Erase</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmErase(true)} className="btn btn-destructive btn-block"><Trash2 size={17} /> Erase vault from this device</button>
        )}
      </div>
    </Sheet>
  );
}

function Toggle({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${on ? "bg-accent" : "bg-surface-3"}`}
    >
      <i className={`absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.18)] transition-transform duration-300 ease-spring ${on ? "translate-x-[20px]" : ""}`} />
    </button>
  );
}

/* ------------------------------------------------------------------ handed over at a clinic */

/**
 * A summary that arrived through a clinic's QR link. It's checked before it can be
 * kept: the signature against the registry, and that it was issued to this person.
 */
function IncomingSummary({ owner, snap, items }: { owner: string; snap: RegistrySnapshot | null; items: VaultItem[] }) {
  const [raw, setRaw] = useState(peekIncoming);
  const [jws, setJws] = useState<string | null>(null);
  const [result, setResult] = useState<Verification | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => onIncomingChange(() => setRaw(peekIncoming())), []);

  useEffect(() => {
    if (!raw) return;
    unpack(raw).then(setJws).catch(() => setError("This code couldn’t be read. Ask the clinic to show it again."));
  }, [raw]);
  useEffect(() => {
    if (!jws || !snap) return;
    verifySummary(jws, snap.registry).then(setResult);
  }, [jws, snap]);

  if (!raw) return null;
  const p = result?.payload;
  const forSomeoneElse = !!p && p.sub !== owner;
  const already = !!p && items.some((i) => i.id === p.jti);
  const canKeep = result?.verdict === "valid" && !forSomeoneElse && !already;
  const v = result ? VERDICT[result.verdict] : null;

  async function keep() {
    if (!jws || !p) return;
    setSaving(true);
    try { await addItem({ id: p.jti, jws, addedAt: new Date().toISOString() }); clearIncoming(); }
    catch { setError("Couldn’t save it to your vault. Try again."); }
    finally { setSaving(false); }
  }

  return (
    <section className="glass dialog-enter mt-3 p-5 ring-2 ring-[var(--accent)]">
      <p className="eyebrow">From your clinic</p>
      {error ? <p className="mt-2 text-footnote text-critical">{error}</p> : !p || !v ? (
        <div className="mt-3 space-y-2"><span className="skeleton block h-5 w-56" /><span className="skeleton block h-4 w-40" /></div>
      ) : (
        <>
          <p className="mt-1.5 text-headline font-semibold">{TIERS[p.vc.credentialSubject.tier].name} · v{p.vc.credentialSubject.version}</p>
          <p className="text-footnote text-ink-2">Issued by {p.vc.issuer.name}{p.vc.credentialSubject.issuedBy ? ` (${p.vc.credentialSubject.issuedBy})` : ""} · {fmtDate(p.vc.credentialSubject.asOf)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`badge h-6 ${v.tone}`}><v.Icon size={13} strokeWidth={2.4} />{v.label}</span>
            {forSomeoneElse && <span className="badge h-6 bg-critical-tint text-critical"><ShieldX size={13} strokeWidth={2.4} />Issued to someone else</span>}
            {already && <span className="badge h-6 bg-surface-2 text-ink-2"><Check size={13} strokeWidth={2.4} />Already in your vault</span>}
          </div>
          {forSomeoneElse && <p className="mt-3 text-footnote text-ink-2">This summary names a different CLANCLAST ID, so it can’t be kept here. Tell the clinic.</p>}
        </>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button onClick={clearIncoming} className="btn btn-quiet">{canKeep ? "Not now" : "Dismiss"}</button>
        <button onClick={keep} disabled={!canKeep || saving} className="btn btn-primary"><LockKeyhole size={16} /> {saving ? "Saving…" : "Keep in vault"}</button>
      </div>
    </section>
  );
}
