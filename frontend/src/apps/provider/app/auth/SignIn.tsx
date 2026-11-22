import { useState, type ReactNode } from "react";
import { Eye, EyeOff, Fingerprint, Handshake, ScrollText, ShieldCheck } from "lucide-react";
import { ApiError, authApi, type ProviderSession } from "../../lib/api";
import { Logo } from "../brand/Logo";
import { BrandWeave } from "../brand/BrandWeave";
import { Segmented, TextField } from "../ui/controls";
import { navigate } from "../lib/router";

/** The Canon, in a clinician's words. */
const PRINCIPLES = [
  { Icon: Fingerprint, title: "One patient, one identity", body: "Fragmented records across institutions resolve to one CLANCLAST ID. Uncertain matches go to a person, never auto-merged." },
  { Icon: Handshake, title: "The patient approves access", body: "You request; the patient approves on their phone, card or USSD. Every access is logged and visible to them." },
  { Icon: ScrollText, title: "Your records stay yours", body: "CLANCLAST never stores clinical records. You issue signed summaries the patient carries; your system stays the source of truth." },
];

const ORG_TYPES = [
  { value: "HOSPITAL", label: "Hospital" },
  { value: "CLINIC", label: "Clinic" },
  { value: "LABORATORY", label: "Lab" },
  { value: "PHARMACY", label: "Pharmacy" },
] as const;

type Mode = "login" | "join";

export function SignIn({ mode, onSession }: { mode: Mode; onSession: (s: ProviderSession) => void }) {
  return (
    <div className="ambient h-full text-ink">
      <div className="scroll-area no-scrollbar h-full">
        <div className="mx-auto grid min-h-full w-full @4xl/app:grid-cols-[1.05fr_1fr] @4xl/app:gap-3 @4xl/app:p-3">
          {/* Brand panel: a short header on phones, the full left half on wide screens */}
          <aside className="hero flex flex-col rounded-none px-6 pb-14 @4xl/app:rounded-[var(--radius-card)] @4xl/app:p-10" style={{ paddingTop: "calc(var(--safe-top) + 16px)" }}>
            <BrandWeave preset="hero" scrim="bottom" />
            <div className="relative z-10 flex h-full flex-col">
              <div className="flex items-center gap-2.5">
                <Logo layout="horizontal" height={26} surface="dark" priority />
                <span className="rounded-[6px] bg-white/12 px-1.5 py-0.5 text-micro font-semibold uppercase tracking-[0.1em] text-white/85">Provider</span>
              </div>
              <div className="mt-10 @4xl/app:mt-auto">
                <h1 className="max-w-[16ch] text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] text-white @4xl/app:text-[2.75rem]">
                  Know who’s in front of you.
                </h1>
                <p className="mt-3 max-w-[44ch] text-callout text-white/75">
                  Verify identity in seconds, request consent the patient controls, and read signed summaries even when the source system is down.
                </p>
              </div>
              <ul className="mt-10 hidden gap-3 @4xl/app:grid">
                {PRINCIPLES.map(({ Icon, title, body }) => (
                  <li key={title} className="flex gap-3.5 rounded-[18px] bg-white/[0.07] p-4 ring-1 ring-inset ring-white/10">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-white/10 text-[var(--brand-200)]"><Icon size={18} /></span>
                    <span>
                      <span className="block text-callout font-semibold text-white">{title}</span>
                      <span className="mt-0.5 block text-footnote text-white/65">{body}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <section className="relative -mt-8 flex flex-col rounded-t-[32px] bg-[var(--canvas-base)] px-6 pt-7 @4xl/app:mt-0 @4xl/app:items-center @4xl/app:justify-center @4xl/app:rounded-none @4xl/app:bg-transparent" style={{ paddingBottom: "calc(var(--safe-bottom) + 32px)" }}>
            <div className="w-full @4xl/app:max-w-[400px]">
              <Segmented<Mode>
                label="Account" value={mode}
                onChange={(m) => navigate(m, { replace: true })}
                options={[{ v: "login", label: "Sign in" }, { v: "join", label: "Register an institution" }]}
              />
              <div className="mt-6">{mode === "login" ? <LoginForm onSession={onSession} /> : <JoinForm onSession={onSession} />}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Heading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-title-2 font-semibold tracking-[-0.02em]">{title}</h2>
      <p className="mt-1 text-subhead text-ink-2">{sub}</p>
    </div>
  );
}

function Password({ value, onChange, autoComplete }: { value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <TextField label="Password" type={show ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={onChange} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}
        className="absolute bottom-0 right-1 grid h-12 w-11 place-items-center text-ink-2">
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function Failure({ children }: { children: ReactNode }) {
  return <p role="alert" className="rounded-[14px] bg-critical-tint px-3.5 py-2.5 text-footnote text-critical">{children}</p>;
}

function LoginForm({ onSession }: { onSession: (s: ProviderSession) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try { onSession(await authApi.login(email.trim(), password)); }
    catch (err) {
      setError(!(err instanceof ApiError) || err.status >= 500 ? "We couldn’t reach CLANCLAST. Check your connection and try again."
        : err.status === 429 ? "Too many sign-in attempts. Wait a few minutes, then try again."
        : "That email and password don’t match an account.");
    }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Heading title="Welcome back" sub="Sign in with your work email." />
      <TextField label="Work email" type="email" autoComplete="username" inputMode="email" value={email} onChange={setEmail} />
      <Password value={password} onChange={setPassword} autoComplete="current-password" />
      {error && <Failure>{error}</Failure>}
      <button type="submit" disabled={busy || !email || !password} className="btn btn-primary btn-lg btn-block">{busy ? "Signing in…" : "Sign in"}</button>
      <button type="button" onClick={() => { setEmail("dr.naidoo@riverside.demo"); setPassword("Provider123!"); }} className="flex w-full items-center justify-between rounded-2xl border border-dashed border-accent-tint-2 bg-accent-tint px-4 py-3 text-left">
        <span>
          <span className="block text-xs font-bold text-accent">Demo account</span>
          <span className="tnum text-xs text-ink-2">dr.naidoo@riverside.demo · Provider123!</span>
        </span>
        <span className="text-xs font-bold text-accent">Use</span>
      </button>
      <p className="flex items-start gap-2 pt-2 text-footnote text-ink-2">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-accent" />
        Every patient you open is recorded in their access log, which they can see.
      </p>
    </form>
  );
}

function JoinForm({ onSession }: { onSession: (s: ProviderSession) => void }) {
  const [f, setF] = useState({ organizationName: "", organizationType: "CLINIC" as (typeof ORG_TYPES)[number]["value"], fullName: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof typeof f>(k: K) => (v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const ok = f.organizationName.trim().length >= 2 && f.fullName.trim().length >= 2 && /\S+@\S+\.\S+/.test(f.email) && f.password.length >= 8;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try { onSession(await authApi.register({ ...f, organizationName: f.organizationName.trim(), fullName: f.fullName.trim(), email: f.email.trim() })); }
    catch (err) { setError(err instanceof ApiError ? err.message : "We couldn’t reach CLANCLAST. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Heading title="Register your institution" sub="You’ll be its first administrator. Your institution appears as pending until CLANCLAST verifies it." />
      <TextField label="Institution name" autoComplete="organization" value={f.organizationName} onChange={set("organizationName")} />
      <div>
        <p className="mb-1.5 text-footnote font-medium text-ink-2">Type</p>
        <Segmented label="Institution type" size="sm" value={f.organizationType} onChange={set("organizationType")} options={ORG_TYPES.map((t) => ({ v: t.value, label: t.label }))} />
      </div>
      <TextField label="Your full name" autoComplete="name" value={f.fullName} onChange={set("fullName")} />
      <TextField label="Work email" type="email" autoComplete="email" inputMode="email" value={f.email} onChange={set("email")} />
      <Password value={f.password} onChange={set("password")} autoComplete="new-password" />
      {f.password.length > 0 && f.password.length < 8 && <p className="-mt-2 text-footnote text-ink-2">At least 8 characters.</p>}
      {error && <Failure>{error}</Failure>}
      <button type="submit" disabled={busy || !ok} className="btn btn-primary btn-lg btn-block">{busy ? "Creating…" : "Create institution account"}</button>
    </form>
  );
}
