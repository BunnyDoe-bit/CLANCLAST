import { useState } from "react";
import { ArrowRight, Check, FileSignature, Handshake, LockKeyhole, ShieldCheck } from "lucide-react";
import { ApiError, authApi } from "../../lib/api";
import { AuthLayout } from "./AuthLayout";
import { TextField } from "../ui/controls";

/**
 * Registration — four honest steps. No clinical data is collected (Canon Rule 1),
 * no identity is claimed as verified until a participating clinic verifies it.
 */
type Registered = { token: string; patient: { id: string; humanetId: string; fullName: string; passportCompletion: number } };

type Props = {
  onBack: () => void;
  /** Called once the account exists; the parent stores the session. */
  onRegistered: (r: Registered) => void;
  onFinish: (next: "vault" | "home") => void;
};

/** South African ID: 13 digits, YYMMDD prefix, Luhn checksum. */
function checkSaId(id: string): { ok: boolean; dob?: string } {
  if (!/^\d{13}$/.test(id)) return { ok: false };
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let d = +id[12 - i];
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  if (sum % 10 !== 0) return { ok: false };
  const yy = +id.slice(0, 2), mm = +id.slice(2, 4), dd = +id.slice(4, 6);
  const year = yy + (yy > new Date().getFullYear() % 100 ? 1900 : 2000);
  const date = new Date(Date.UTC(year, mm - 1, dd));
  if (date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd) return { ok: false };
  return { ok: true, dob: `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}` };
}

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return s; // 0–4
}

const STEP_TITLES = ["About you", "Emergency contact", "You're in control", "Your ID is ready"];

export function Register({ onBack, onRegistered, onFinish }: Props) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ fullName: "", nationalId: "", dateOfBirth: "", mobile: "", password: "", emergencyContactName: "", emergencyContactRelationship: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Registered["patient"] | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const id = checkSaId(f.nationalId.replace(/\s/g, ""));
  const pw = strength(f.password);
  const mobileOk = /^(\+27|0)\d{9}$/.test(f.mobile.replace(/\s/g, ""));
  const step1Ok = f.fullName.trim().length >= 2 && id.ok && !!f.dateOfBirth && mobileOk && f.password.length >= 8;

  async function submit() {
    setBusy(true); setError("");
    try {
      const mobile = f.mobile.replace(/\s/g, "").replace(/^0/, "+27");
      const r = await authApi.patientRegister({
        fullName: f.fullName.trim(), dateOfBirth: f.dateOfBirth, nationalId: f.nationalId.replace(/\s/g, ""), mobile, password: f.password,
        ...(f.emergencyContactName ? { emergencyContactName: f.emergencyContactName, emergencyContactRelationship: f.emergencyContactRelationship } : {}),
      });
      onRegistered(r);
      setCreated(r.patient);
      setStep(4);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "We couldn't create your ID. Check your connection and try again.");
    } finally { setBusy(false); }
  }

  const back = step === 4 ? undefined : () => { setError(""); step > 1 ? setStep(step - 1) : onBack(); };

  return (
    <AuthLayout onBack={back} eyebrow={`Step ${step} of 4`} title={STEP_TITLES[step - 1]} progress={{ step, total: 4 }}
      sub={step === 1 ? "We use this to create your CLANCLAST ID. Nothing here is clinical." : undefined}>
      {step === 1 && (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (step1Ok) setStep(2); }}>
          <TextField label="Full name" autoComplete="name" value={f.fullName} onChange={set("fullName")} />
          <div>
            <TextField label="South African ID number" inputMode="numeric" autoComplete="off" value={f.nationalId}
              onChange={(v) => { const clean = v.replace(/[^\d\s]/g, "").slice(0, 15); set("nationalId")(clean); const c = checkSaId(clean.replace(/\s/g, "")); if (c.ok && c.dob) set("dateOfBirth")(c.dob); }} />
            {f.nationalId.replace(/\s/g, "").length === 13 && !id.ok && <p className="mt-1.5 text-footnote text-critical">That ID number doesn't look right. Check the digits.</p>}
          </div>
          <TextField label="Date of birth" type="date" value={f.dateOfBirth} onChange={set("dateOfBirth")} />
          <div>
            <TextField label="Mobile number" type="tel" inputMode="tel" autoComplete="tel" placeholder="082 555 0198" value={f.mobile} onChange={set("mobile")} />
            {f.mobile.length > 6 && !mobileOk && <p className="mt-1.5 text-footnote text-critical">Use a South African mobile number, e.g. 082 555 0198.</p>}
          </div>
          <div>
            <TextField label="Password" type="password" autoComplete="new-password" value={f.password} onChange={set("password")} />
            <div className="mt-2 flex items-center gap-2" aria-live="polite">
              <div className="grid flex-1 grid-cols-4 gap-1">{[0, 1, 2, 3].map((i) => <i key={i} className={`h-1 rounded-full transition-colors duration-300 ${i < pw ? (pw >= 3 ? "bg-positive" : pw === 2 ? "bg-warning" : "bg-critical") : "bg-surface-3"}`} />)}</div>
              <span className="w-28 text-right text-caption text-ink-2">{f.password.length < 8 ? "At least 8 characters" : ["Weak", "Weak", "Fair", "Good", "Strong"][pw]}</span>
            </div>
          </div>
          <button type="submit" disabled={!step1Ok} className="btn btn-primary btn-lg btn-block mt-2">Continue</button>
        </form>
      )}

      {step === 2 && (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
          <p className="text-callout text-ink-2">Who should a clinic contact if you can't speak for yourself? You can add or change this later.</p>
          <TextField label="Name" autoComplete="off" value={f.emergencyContactName} onChange={set("emergencyContactName")} />
          <TextField label="Relationship" value={f.emergencyContactRelationship} onChange={set("emergencyContactRelationship")} />
          <button type="submit" className="btn btn-primary btn-lg btn-block mt-2">{f.emergencyContactName ? "Continue" : "Skip for now"}</button>
        </form>
      )}

      {step === 3 && (
        <div>
          <ul className="list-group">
            {[
              [Handshake, "Nothing is shared without you", "Providers ask; you approve, decline or revoke."],
              [FileSignature, "Summaries are signed by your clinic", "You carry them on your phone. Any change breaks the signature."],
              [ShieldCheck, "We never hold your records", "Your clinics keep them. CLANCLAST connects them and logs every access."],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof Handshake;
              return (
                <li key={t as string} className="list-row items-start py-3.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-accent-tint text-accent"><I size={18} /></span>
                  <span><span className="block text-callout font-semibold">{t as string}</span><span className="block text-footnote text-ink-2">{d as string}</span></span>
                </li>
              );
            })}
          </ul>
          {error && <p role="alert" className="mt-4 rounded-[14px] bg-critical-tint px-3.5 py-2.5 text-footnote text-critical">{error}</p>}
          <button onClick={submit} disabled={busy} className="btn btn-primary btn-lg btn-block mt-5">{busy ? "Creating your ID…" : "Agree and create my ID"}</button>
        </div>
      )}

      {step === 4 && created && (
        <div className="text-center">
          <span className="enter mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent text-on-accent"><Check size={32} strokeWidth={2.6} /></span>
          <p className="mt-5 text-title-3 font-semibold">{created.fullName}</p>
          <p className="mono mt-1 text-title-2 tracking-[0.02em]">{created.humanetId}</p>
          <p className="mx-auto mt-4 max-w-[340px] rounded-[16px] bg-warning-tint px-4 py-3 text-left text-footnote text-warning">
            <b className="font-semibold">Identity check pending.</b> A participating clinic confirms it's you at your next visit. Until then, providers see your ID as unverified.
          </p>
          <div className="mt-6 grid gap-2.5">
            <button onClick={() => onFinish("vault")} className="btn btn-primary btn-lg btn-block"><LockKeyhole size={18} /> Set up your vault</button>
            <button onClick={() => onFinish("home")} className="btn btn-quiet btn-lg btn-block">Go to Today <ArrowRight size={17} /></button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
