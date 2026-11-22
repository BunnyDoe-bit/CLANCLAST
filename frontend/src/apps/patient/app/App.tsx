import { useState, useEffect, lazy, Suspense } from "react";
import { AlertTriangle, ChevronRight, CreditCard, X, Loader2 } from "lucide-react";
import { Accessibility, Download, Eye, EyeOff, FlaskConical, Globe, LogOut, Share2, ShieldCheck, Sun, Syringe } from "lucide-react";
import { authApi, patientApi, ApiError, getToken, setToken as saveToken, clearToken } from "../lib/api";
import { Logo } from "./brand/Logo";
import { BrandWeave } from "./brand/BrandWeave";
import { Overlay, OverlayRoot } from "./ui/Overlay";
import { SupportHost, supportEnabled, openSupport } from "./support/Support";
import { AuthLayout } from "./auth/AuthLayout";
import { Welcome } from "./auth/Welcome";
import { Register } from "./auth/Register";
import { AppShell } from "./shell/AppShell";
import { PresentationFrame } from "./shell/PresentationFrame";
import { AUTH_VIEWS, navigate, useView } from "./lib/router";
import { usePrefs } from "./lib/preferences";
import { lock as lockVault } from "./vault/vault";
import { hasIncoming } from "./vault/incoming";
import TodayView from "./today/TodayView";

// The vault (crypto, PIN pad, verifier) is its own chunk, fetched on first visit or nav hover.
const VaultView = lazy(() => import("./vault/VaultView"));
const ShareView = lazy(() => import("./share/ShareView"));
const ConsentView = lazy(() => import("./consent/ConsentView"));
const AccountView = lazy(() => import("./account/AccountView"));
const AccessLogView = lazy(() => import("./account/AccessLogView"));
const CareTeamView = lazy(() => import("./network/CareTeamView"));
const NotificationsView = lazy(() => import("./network/NotificationsView"));
const PassportView = lazy(() => import("./network/PassportView"));

function Modal({ title, children, close }: { title: string; children: React.ReactNode; close: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [close]);
  return (
    <Overlay>
    <div className="fixed inset-0 z-50 flex items-end justify-center @3xl/app:items-center @3xl/app:p-6" onClick={close}>
      <div aria-hidden="true" className="scrim-enter absolute inset-0 bg-[rgb(4_20_18/0.28)] backdrop-blur-[6px]" />
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={title}
        className="sheet-enter glass-float relative m-2 max-h-[88%] w-[calc(100%-16px)] overflow-y-auto rounded-[32px] px-5 pb-[calc(var(--safe-bottom)+20px)] pt-2 @3xl/app:max-w-[480px] @3xl/app:pb-6 @3xl/app:pt-5"
      >
        <div className="mx-auto mb-3 h-[5px] w-9 rounded-full bg-surface-3 @3xl/app:hidden" />
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-title-3 font-semibold">{title}</h2>
          <button onClick={close} aria-label="Close" className="icon-btn -mr-2 -mt-1.5 h-9 w-9 bg-surface-2 text-ink-2"><X size={16} strokeWidth={2.2} /></button>
        </div>
        {children}
      </div>
    </div>
    </Overlay>
  );
}

function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-critical-tint px-3 py-2.5 text-footnote font-medium text-critical">
      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

const AuthShell = AuthLayout;
const btnPrimary = "btn btn-primary btn-lg btn-block";

function Spinner() {
  return <Loader2 className="animate-spin" size={18} />;
}

function Input({ label, value, onChange, type = "text", placeholder, autoComplete, inputMode }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; autoComplete?: string; inputMode?: "text" | "numeric" | "tel" | "email";
}) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="relative block">
        <input
          type={isPw && show ? "text" : type} value={value} placeholder={placeholder} autoComplete={autoComplete} inputMode={inputMode}
          onChange={(e) => onChange(e.target.value)}
          className={`input ${isPw ? "pr-12" : ""}`}
        />
        {isPw && (
          <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((v) => !v)} className="icon-btn absolute right-0.5 top-1/2 h-11 w-11 -translate-y-1/2 text-ink-2">
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </span>
    </label>
  );
}

export default function App() {
  const { present } = usePrefs();
  const app = <><Patient /><SupportHost /></>;
  return present
    ? <PresentationFrame>{app}</PresentationFrame>
    : <div className="@container/app relative h-full">{app}<OverlayRoot /></div>;
}

type PatientProfile = { id: string; humanetId: string; fullName: string; passportCompletion: number };


function Patient() {
  const [view, setView] = useView();
  const [modal, setModal] = useState("");
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [passport, setPassport] = useState<any>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [consent, setConsent] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  // Route guard: signed-out users only see auth screens; signed-in users skip them.
  const authed = !!getToken("patient");
  useEffect(() => {
    if (!authed && !AUTH_VIEWS.has(view)) navigate("welcome", { replace: true });
    if (authed && (view === "welcome" || view === "login")) navigate(hasIncoming() ? "vault" : "home", { replace: true });
  }, [authed, view]);

  useEffect(() => {
    const onExpired = () => signOut();
    window.addEventListener("cc:session-expired", onExpired);
    return () => window.removeEventListener("cc:session-expired", onExpired);
  });

  useEffect(() => {
    if (view === "records") navigate("vault", { replace: true });
    if (view === "profile-privacy" || view === "profile-notifications" || view === "profile-language" || view === "profile-accessibility") navigate("profile", { replace: true });
  }, [view]);

  // Large text is a root-level preference so every rem-based token scales with it.
  useEffect(() => { document.documentElement.dataset.largeText = String(!!settings?.largeText); }, [settings?.largeText]);

  async function loadAll() {
    setDataLoading(true);
    try {
      const [p, t, c, n] = await Promise.all([patientApi.passport(), patientApi.team(), patientApi.consent(), patientApi.notifications()]);
      setPassport(p); setTeam(t); setConsent(c); setNotifications(n);
      setProfile({ id: "", humanetId: p.patient.humanetId, fullName: p.patient.fullName, passportCompletion: p.patient.passportCompletion });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load your CLANCLAST data.");
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => {
    if (getToken("patient") && !passport && !dataLoading && !AUTH_VIEWS.has(view)) loadAll();
  }, [view]);


  useEffect(() => {
    if (!getToken("patient")) return;
    if (view === "consent") patientApi.consent().then(setConsent).catch(() => {});
    if (view === "notifications") patientApi.notifications().then(setNotifications).catch(() => {});
    if (view === "team") patientApi.team().then(setTeam).catch(() => {});
  }, [view]);


  useEffect(() => {
    if (view.startsWith("profile") && getToken("patient")) {
      patientApi.settings().then(setSettings).catch(() => {});
    }
  }, [view]);













  async function submitLogin() {
    setBusy(true); setError("");
    try {
      const { token, patient } = await authApi.patientLogin(loginForm.identifier, loginForm.password);
      saveToken("patient", token);
      setProfile(patient);
      setView("home");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    lockVault();
    clearToken("patient");
    setProfile(null); setPassport(null); setTeam([]); setConsent([]); setNotifications([]);
    setSettings(null);
    setView("welcome");
  }



  if (view === "welcome") {
    return (
      <>
        <Welcome
          onCreate={() => { setError(""); setView("onboarding"); }}
          onSignIn={() => { setError(""); setView("login"); }}
          onAssist={() => setModal("assist")}
          onHelp={() => setModal("help")}
        />
        {modal && <AccessModal kind={modal} close={() => setModal("")} />}
      </>
    );
  }

  if (view === "login") {
    return (
      <AuthShell onBack={() => setView("welcome")} eyebrow="Secure sign in" title="Welcome back" sub="Sign in with your mobile number or email.">
        <form onSubmit={(e) => { e.preventDefault(); if (!busy) submitLogin(); }} className="space-y-4">
          <Input label="Mobile or email" autoComplete="username" value={loginForm.identifier} onChange={(v) => setLoginForm((f) => ({ ...f, identifier: v }))} />
          <Input label="Password" type="password" autoComplete="current-password" value={loginForm.password} onChange={(v) => setLoginForm((f) => ({ ...f, password: v }))} />
          <button type="submit" disabled={busy} className={btnPrimary}>{busy && <Spinner />}Sign in</button>
        </form>
        <ErrorNote message={error} />
        <button type="button" onClick={() => setLoginForm({ identifier: "+27825550198", password: "Patient123!" })} className="mt-6 flex w-full items-center justify-between rounded-2xl border border-dashed border-accent-tint-2 bg-accent-tint px-4 py-3 text-left">
          <span>
            <span className="block text-xs font-bold text-accent">Demo account</span>
            <span className="tnum text-xs text-ink-2">+27825550198 · Patient123!</span>
          </span>
          <span className="text-xs font-bold text-accent">Use</span>
        </button>
      </AuthShell>
    );
  }

  if (view === "onboarding") {
    return (
      <Register
        onBack={() => setView("welcome")}
        onRegistered={({ token, patient }) => { saveToken("patient", token); setProfile(patient); }}
        onFinish={(next) => setView(next)}
      />
    );
  }

  const pendingConsent = consent.filter((c) => c.status === "PENDING").length;

  const content: Record<string, React.ReactNode> = {
    vault: (
      <Suspense fallback={<div aria-busy="true"><div className="skeleton h-10 w-32" /><div className="skeleton mt-6 h-[188px] !rounded-[var(--radius-card)]" /></div>}>
        <VaultView patientId={profile?.humanetId} name={profile?.fullName} />
      </Suspense>
    ),
    profile: (
      <Suspense fallback={<div aria-busy="true"><div className="skeleton h-10 w-40" /><div className="skeleton mt-5 h-[88px] !rounded-[var(--radius-card)]" /><div className="skeleton mt-6 h-[220px] !rounded-[var(--radius-card)]" /></div>}>
        <AccountView view={view} settings={settings} setSettings={setSettings} teamCount={team.length} onSignOut={signOut} />
      </Suspense>
    ),
    "profile-personal": (
      <Suspense fallback={<div aria-busy="true"><div className="skeleton h-10 w-40" /><div className="skeleton mt-5 h-[88px] !rounded-[var(--radius-card)]" /><div className="skeleton mt-6 h-[220px] !rounded-[var(--radius-card)]" /></div>}>
        <AccountView view={view} settings={settings} setSettings={setSettings} teamCount={team.length} onSignOut={signOut} />
      </Suspense>
    ),
    "profile-caregivers": (
      <Suspense fallback={<div aria-busy="true"><div className="skeleton h-10 w-40" /><div className="skeleton mt-5 h-[88px] !rounded-[var(--radius-card)]" /><div className="skeleton mt-6 h-[220px] !rounded-[var(--radius-card)]" /></div>}>
        <AccountView view={view} settings={settings} setSettings={setSettings} teamCount={team.length} onSignOut={signOut} />
      </Suspense>
    ),
    "profile-access-log": (
      <Suspense fallback={<div aria-busy="true"><div className="skeleton h-10 w-44" /><div className="skeleton mt-5 h-[84px] !rounded-[var(--radius-card)]" /></div>}>
        <AccessLogView />
      </Suspense>
    ),
    team: (
      <Suspense fallback={<div aria-busy="true"><div className="skeleton h-10 w-44" /><div className="skeleton mt-5 h-[220px] !rounded-[var(--radius-card)]" /></div>}>
        <CareTeamView view={view} team={team} refreshTeam={() => patientApi.team().then(setTeam).catch(() => {})} />
      </Suspense>
    ),
    "connect-provider": (
      <Suspense fallback={<div aria-busy="true"><div className="skeleton h-10 w-44" /><div className="skeleton mt-5 h-[220px] !rounded-[var(--radius-card)]" /></div>}>
        <CareTeamView view={view} team={team} refreshTeam={() => patientApi.team().then(setTeam).catch(() => {})} />
      </Suspense>
    ),
    notifications: (
      <Suspense fallback={<div aria-busy="true"><div className="skeleton h-10 w-44" /><div className="skeleton mt-5 h-[260px] !rounded-[var(--radius-card)]" /></div>}>
        <NotificationsView items={notifications} setItems={setNotifications} />
      </Suspense>
    ),
    passport: (
      <Suspense fallback={<div aria-busy="true"><div className="skeleton h-10 w-44" /><div className="skeleton mt-5 h-[180px] !rounded-[var(--radius-card)]" /></div>}>
        <PassportView passport={passport} />
      </Suspense>
    ),
    home: (
      <TodayView
        name={profile?.fullName}
        clanclastId={profile?.humanetId}
        identityVerified={passport?.patient?.identityVerified}
        loading={dataLoading}
        consent={consent}
        teamCount={team.length}
        openNoSmartphone={() => setModal("demo")}
      />
    ),
    consent: (
      <Suspense fallback={<div aria-busy="true"><div className="skeleton h-10 w-36" /><div className="skeleton mt-6 h-[300px] !rounded-[var(--radius-card)]" /></div>}>
        <ConsentView
          items={consent}
          setItems={setConsent}
          defaultDuration={settings?.defaultConsentDuration}
          onSettled={() => {
            // Background refresh: server truth for the list, plus anything that depends on consent.
            Promise.all([patientApi.consent(), patientApi.notifications(), patientApi.passport()])
              .then(([c, n, p]) => { setConsent(c); setNotifications(n); setPassport(p); })
              .catch(() => {});
          }}
        />
      </Suspense>
    ),
    qr: (
      <Suspense fallback={<div aria-busy="true"><div className="skeleton h-10 w-32" /><div className="skeleton mt-6 h-12 !rounded-[18px]" /><div className="skeleton mt-4 h-[420px] !rounded-[var(--radius-card)]" /></div>}>
        <ShareView patientId={profile?.humanetId} name={profile?.fullName} />
      </Suspense>
    ),
  };

  return (
    <>
      <AppShell
        view={view}
        go={setView}
        pendingConsent={pendingConsent}
        unread={notifications.some((n) => !n.read)}
        name={profile?.fullName}
        clanclastId={profile?.humanetId}
        onSignOut={signOut}
      >
        {content[view] || content.home}
      </AppShell>
      {modal === "demo" && <NoSmartphoneSheet close={() => setModal("")} profile={profile} />}
    </>
  );
}

/** "No smartphone? Still connected." — honest about what exists today vs. the clinic pilot (Stage 2). */
function NoSmartphoneSheet({ close, profile }: { close: () => void; profile: PatientProfile | null }) {
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState("");
  async function download() {
    if (!profile) return;
    setDownloading(true); setErr("");
    try { await patientApi.downloadHealthCard(profile.humanetId); } catch { setErr("Couldn't create your health card. Try again."); } finally { setDownloading(false); }
  }
  const channels: [string, string, boolean][] = [
    ["Health card", "Printed card with your ID code, shown at reception", true],
    ["Caregiver", "Someone you trust approves requests for you", true],
    ["USSD", "Approve requests by dialling in from any phone", false],
    ["SMS", "Get requests and reply by text message", false],
  ];
  return (
    <Modal title="No smartphone? Still connected." close={close}>
      <p className="text-callout text-ink-2">Your CLANCLAST ID works without an app, so you're never shut out of your own care.</p>
      <ul className="list-group mt-4">
        {channels.map(([t, d, live]) => (
          <li key={t} className="list-row">
            <span className="min-w-0 flex-1">
              <span className="block text-callout font-semibold">{t}</span>
              <span className="block text-footnote text-ink-2">{d}</span>
            </span>
            <span className={`badge shrink-0 ${live ? "bg-positive-tint text-positive" : "bg-surface-2 text-ink-2"}`}>{live ? "Available" : "Clinic pilot"}</span>
          </li>
        ))}
      </ul>
      {err && <p role="alert" className="mt-3 rounded-[14px] bg-critical-tint px-3.5 py-2.5 text-footnote text-critical">{err}</p>}
      <div className="mt-5 grid gap-2">
        <button disabled={downloading || !profile} onClick={download} className="btn btn-primary btn-lg btn-block"><CreditCard size={18} /> {downloading ? "Preparing your card…" : "Download health card (PDF)"}</button>
        <button onClick={() => { close(); navigate("profile-caregivers"); }} className="btn btn-quiet btn-lg btn-block">Add a caregiver</button>
      </div>
    </Modal>
  );
}

function AccessModal({ kind, close }: { kind: string; close: () => void }) {
  const channels: [string, string][] = [["Health card", "Tap or scan at reception"], ["USSD", "Dial in from any phone"], ["SMS", "Approve requests by text"], ["Caregiver", "Someone you trust can help"]];
  return (
    <Modal title={kind === "assist" ? "Registering at a clinic" : "Help accessing CLANCLAST"} close={close}>
      <p className="text-callout text-ink-2">
        {kind === "assist"
          ? "Staff at a participating clinic can create your CLANCLAST ID with you, even if you don't have a smartphone."
          : "CLANCLAST works beyond smartphones. A participating clinic can help you create or recover your ID, and you can use it in any of these ways:"}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {channels.map(([t, d]) => (
          <div key={t} className="rounded-[16px] bg-surface-2 p-3">
            <p className="text-footnote font-semibold">{t}</p>
            <p className="text-caption text-ink-2">{d}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-2">
        <button onClick={close} className="btn btn-primary btn-lg btn-block">Got it</button>
        {supportEnabled && <button onClick={() => { close(); openSupport(); }} className="btn btn-quiet btn-lg btn-block">Report a problem</button>}
      </div>
    </Modal>
  );
}
