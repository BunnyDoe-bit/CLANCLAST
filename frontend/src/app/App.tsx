import { useState, useEffect } from "react";
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, Bell, BookOpen,
  Building2, Check, CheckCircle2, ChevronRight, ClipboardCheck, Clock, CreditCard,
  FileCheck2, FileText, Fingerprint, Heart, HeartPulse, HelpCircle, Home,
  Hospital, KeyRound, Laptop, Lock, Menu, MoreHorizontal, Paperclip, Phone, Pill,
  Plus, QrCode, Radio, Search, Send, Settings, Shield, ShieldAlert, Smartphone,
  Stethoscope, User, UserCheck, Users, Wifi, X, Zap, Loader2, type LucideIcon
} from "lucide-react";
import { authApi, patientApi, providerApi, verifyApi, connectApi, caregiverApi, ussdApi, ApiError, getToken, setToken as saveToken, clearToken } from "../lib/api";
import { Brand } from "./components/shared/Brand";
import { PillStatus } from "./components/shared/PillStatus";
import { MavenLanding } from "./components/landing/MavenLanding";

type Context = "landing" | "patient" | "provider" | "connect" | "verify" | "onboard" | "ussd" | "caregiver";

const patientNav: [string, LucideIcon][] = [
  ["Home", Home], ["Health Passport", Shield], ["Summaries", FileText], ["Team", Users], ["Consent", Lock], ["Profile", User]
];
const providerNav: [string, LucideIcon][] = [
  ["Dashboard", Home], ["Check-in", Fingerprint], ["Patients", Users], ["Registration", UserCheck], ["Verification", BadgeCheck], ["Referrals", Send], ["Consent Requests", Lock], ["Connections", Wifi], ["Activity", Activity], ["Settings", Settings]
];

function QR({ className = "", src }: { className?: string; src?: string }) {
  if (src) {
    return <img src={src} alt="CLANCLAST code" className={`rounded-2xl bg-white p-3 ${className}`} />;
  }
  const cells = Array.from({ length: 121 }, (_, i) => (i * 7 + Math.floor(i / 11) * 3) % 5 < 2 || [0,1,2,11,12,13,22,23,24,8,9,10,19,20,21,88,89,90,99,100,101,110,111,112].includes(i));
  return (
    <div className={`grid grid-cols-11 gap-[3px] rounded-2xl bg-white p-3 ${className}`}>
      {cells.map((on, i) => <i key={i} className={`aspect-square rounded-[1px] ${on ? "bg-[#072b27]" : "bg-transparent"}`} />)}
    </div>
  );
}

function Modal({ title, children, close }: { title: string; children: React.ReactNode; close: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#072b27]/45 p-4 sm:place-items-center">
      <div className="w-full max-w-md rounded-[28px] bg-card p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="mb-5 flex items-start justify-between">
          <h2 className="font-display text-xl font-extrabold">{title}</h2>
          <button onClick={close} className="rounded-full bg-muted p-2 text-muted-foreground"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="mt-4 flex items-start gap-2 rounded-xl bg-critical-tint p-3 text-xs font-semibold text-critical">
      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function Spinner() {
  return <Loader2 className="animate-spin" size={18} />;
}

export default function App() {
  const [context, setContext] = useState<Context>("landing");

  return (
    <main className="min-h-screen bg-background font-body text-foreground selection:bg-accent">
      {context !== "landing" && <DemoRibbon />}
      {context === "landing" && <MavenLanding setContext={setContext} />}
      {context === "patient" && <Patient setContext={setContext} />}
      {context === "provider" && <Provider setContext={setContext} />}
      {context === "connect" && <Connect setContext={setContext} />}
      {context === "verify" && <Verify setContext={setContext} />}
      {context === "onboard" && <OnboardOrganization setContext={setContext} />}
      {context === "ussd" && <UssdSimulator setContext={setContext} />}
      {context === "caregiver" && <CaregiverPortal setContext={setContext} />}
    </main>
  );
}

/** Every prototype screen says plainly that it is a demonstration with fictional data. */
function DemoRibbon() {
  return (
    <div role="note" className="pointer-events-none fixed bottom-3 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-brand-ink/90 px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur max-md:bottom-[84px]">
      Demo · fictional data · nothing you enter leaves this browser
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block text-xs font-bold text-muted-foreground">
      {label}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20" />
    </label>
  );
}

type PatientProfile = { id: string; ccId: string; fullName: string; passportCompletion: number };
type RegForm = { fullName: string; dateOfBirth: string; nationalId: string; mobile: string; password: string; emergencyContactName: string; emergencyContactRelationship: string; allergies: string; bloodType: string };

const emptyRegForm: RegForm = { fullName: "", dateOfBirth: "", nationalId: "", mobile: "", password: "", emergencyContactName: "", emergencyContactRelationship: "", allergies: "", bloodType: "" };

function Patient({ setContext }: { setContext: (c: Context) => void }) {
  const [view, setView] = useState<string>(getToken("patient") ? "home" : "welcome");
  const [modal, setModal] = useState("");
  const [onboard, setOnboard] = useState(1);
  const [regForm, setRegForm] = useState<RegForm>(emptyRegForm);
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [passport, setPassport] = useState<any>(null);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [consent, setConsent] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [activeSummary, setActiveSummary] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  async function loadAll() {
    setDataLoading(true);
    try {
      const [p, r, t, c, n] = await Promise.all([
        patientApi.passport(), patientApi.summaries(), patientApi.team(), patientApi.consent(), patientApi.notifications(),
      ]);
      setPassport(p); setSummaries(r); setTeam(t); setConsent(c); setNotifications(n);
      setProfile({ id: "", ccId: p.patient.ccId, fullName: p.patient.fullName, passportCompletion: p.patient.passportCompletion });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load your CLANCLAST data.");
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => {
    if (getToken("patient") && view === "home" && !passport) loadAll();
  }, [view]);

  useEffect(() => {
    if (view === "qr" && getToken("patient")) {
      patientApi.fetchQrPng().then(setQrUrl).catch(() => setQrUrl(""));
    }
  }, [view]);

  useEffect(() => {
    if (!getToken("patient")) return;
    if (view === "consent") patientApi.consent().then(setConsent).catch(() => {});
    if (view === "notifications") patientApi.notifications().then(setNotifications).catch(() => {});
    if (view === "team") patientApi.team().then(setTeam).catch(() => {});
    if (view === "summaries") patientApi.summaries().then(setSummaries).catch(() => {});
  }, [view]);

  useEffect(() => {
    if (view === "connect-provider" && getToken("patient")) {
      patientApi.organizations().then(setOrganizations).catch(() => setOrganizations([]));
    }
  }, [view]);

  useEffect(() => {
    if (view.startsWith("profile") && getToken("patient")) {
      patientApi.settings().then(setSettings).catch(() => {});
    }
    if (view === "profile-caregivers" && getToken("patient")) {
      patientApi.caregivers().then(setCaregivers).catch(() => setCaregivers([]));
    }
  }, [view]);

  async function connectToOrganization(organizationId: string) {
    setBusy(true); setError("");
    try {
      await patientApi.connectOrganization(organizationId);
      const t = await patientApi.team();
      setTeam(t);
      setView("team");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not connect to that organisation.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(payload: Record<string, unknown>) {
    setBusy(true); setError("");
    try {
      const updated = await patientApi.updateProfile(payload);
      setSettings(updated);
      if (profile) setProfile({ ...profile, passportCompletion: updated.passportCompletion });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save that change.");
    } finally {
      setBusy(false);
    }
  }

  async function addCaregiver(payload: { name: string; relationship: string; phone?: string; pin?: string }) {
    setBusy(true); setError("");
    try {
      const c = await patientApi.addCaregiver(payload);
      setCaregivers((cs) => [c, ...cs]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not add that caregiver.");
    } finally {
      setBusy(false);
    }
  }

  async function removeCaregiver(id: string) {
    setBusy(true);
    try {
      await patientApi.removeCaregiver(id);
      setCaregivers((cs) => cs.filter((c) => c.id !== id));
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  function updateReg<K extends keyof RegForm>(key: K, value: string) {
    setRegForm((f) => ({ ...f, [key]: value }));
  }

  async function submitRegistration() {
    setBusy(true); setError("");
    try {
      const { token, patient } = await authApi.patientRegister({
        fullName: regForm.fullName, dateOfBirth: regForm.dateOfBirth, nationalId: regForm.nationalId,
        mobile: regForm.mobile, password: regForm.password || "Passw0rd!",
        emergencyContactName: regForm.emergencyContactName, emergencyContactRelationship: regForm.emergencyContactRelationship,
        allergies: regForm.allergies, bloodType: regForm.bloodType,
      });
      saveToken("patient", token);
      setProfile(patient);
      setOnboard(5);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Registration failed. Please check your details and try again.");
    } finally {
      setBusy(false);
    }
  }

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
    clearToken("patient");
    setProfile(null); setPassport(null); setSummaries([]); setTeam([]); setConsent([]); setNotifications([]);
    setOrganizations([]); setCaregivers([]); setSettings(null);
    setView("welcome");
  }

  async function respondToConsent(id: string, action: "approve" | "decline" | "revoke", duration?: "ONCE" | "SEVEN_DAYS" | "UNTIL_REVOKED") {
    setBusy(true); setError("");
    try {
      if (action === "approve") await patientApi.approveConsent(id, duration || "SEVEN_DAYS");
      if (action === "decline") await patientApi.declineConsent(id);
      if (action === "revoke") await patientApi.revokeConsent(id);
      const [c, n, p] = await Promise.all([patientApi.consent(), patientApi.notifications(), patientApi.passport()]);
      setConsent(c); setNotifications(n); setPassport(p);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "That action could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  if (view === "welcome") {
    return (
      <div className="min-h-screen cc-canvas p-4 md:grid md:place-items-center">
        <div className="relative min-h-[760px] w-full overflow-hidden rounded-[34px] bg-background shadow-2xl md:max-w-[430px]">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent" />
          <div className="relative flex min-h-[760px] flex-col p-7">
            <button onClick={() => setContext("landing")} className="self-start"><Brand /></button>
            <div className="mt-auto">
              <div className="mb-6 grid h-16 w-16 place-items-center rounded-[23px] bg-primary text-primary-foreground shadow-lg shadow-primary/20"><HeartPulse size={31} /></div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">CLANCLAST</p>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.04] tracking-[-.035em]">Your healthcare identity, connected.</h1>
              <p className="mt-4 text-[15px] leading-6 text-muted-foreground">Access a more connected healthcare experience wherever you receive care.</p>
              <div className="mt-8 space-y-3">
                <button onClick={() => { setError(""); setRegForm(emptyRegForm); setOnboard(1); setView("onboarding"); }} className="w-full rounded-2xl bg-primary px-5 py-4 text-sm font-bold text-primary-foreground">Create CLANCLAST ID</button>
                <button onClick={() => { setError(""); setView("login"); }} className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-sm font-bold">Sign In</button>
                <button onClick={() => setModal("assist")} className="w-full rounded-2xl bg-muted px-5 py-4 text-sm font-bold text-primary">Continue with Provider Assistance</button>
              </div>
              <button onClick={() => setModal("help")} className="mt-6 flex w-full items-center justify-center gap-2 text-sm font-bold text-primary"><HelpCircle size={17} />I need help accessing CLANCLAST</button>
            </div>
          </div>
        </div>
        {modal && <AccessModal kind={modal} close={() => setModal("")} />}
      </div>
    );
  }

  if (view === "login") {
    return (
      <div className="min-h-screen cc-canvas p-4 md:grid md:place-items-center">
        <div className="min-h-[760px] w-full rounded-[34px] bg-card p-7 shadow-2xl md:max-w-[430px]">
          <button onClick={() => setView("welcome")} className="mb-7 flex items-center gap-2 text-sm font-bold text-muted-foreground"><ArrowLeft size={17} />Back</button>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Secure sign in</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in with your mobile number or email.</p>
          <div className="mt-7 space-y-4">
            <Input label="Mobile or email" value={loginForm.identifier} onChange={(v) => setLoginForm((f) => ({ ...f, identifier: v }))} />
            <Input label="Password" type="password" value={loginForm.password} onChange={(v) => setLoginForm((f) => ({ ...f, password: v }))} />
            <button disabled={busy} onClick={submitLogin} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground disabled:opacity-60">{busy && <Spinner />}Sign in</button>
            <p className="text-center text-xs text-muted-foreground">Demo account: 082 555 0198 · Patient123!</p>
          </div>
          <ErrorNote message={error} />
        </div>
      </div>
    );
  }

  if (view === "onboarding") {
    const stepValid = onboard !== 1 || (regForm.fullName && regForm.dateOfBirth && regForm.nationalId && regForm.mobile && regForm.password);
    return (
      <div className="min-h-screen cc-canvas p-4 md:grid md:place-items-center">
        <div className="min-h-[760px] w-full rounded-[34px] bg-card p-7 shadow-2xl md:max-w-[430px]">
          <button onClick={() => setView("welcome")} className="mb-7 flex items-center gap-2 text-sm font-bold text-muted-foreground"><ArrowLeft size={17} />Back</button>
          <div className="mb-7 flex gap-1.5">{[1, 2, 3, 4, 5].map((n) => <i key={n} className={`h-1 flex-1 rounded-full ${n <= onboard ? "bg-primary" : "bg-muted"}`} />)}</div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Step {onboard} of 5</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold">{["Tell us about you", "Your identity is protected", "Emergency information", "You control access", "Your ID is ready"][onboard - 1]}</h1>
          {onboard < 5 ? (
            <div className="mt-7 space-y-4">
              {onboard === 1 && (
                <>
                  <Input label="Full name" value={regForm.fullName} onChange={(v) => updateReg("fullName", v)} />
                  <Input label="Date of birth" type="date" value={regForm.dateOfBirth} onChange={(v) => updateReg("dateOfBirth", v)} />
                  <Input label="South African ID number" value={regForm.nationalId} onChange={(v) => updateReg("nationalId", v)} />
                  <Input label="Mobile number" value={regForm.mobile} onChange={(v) => updateReg("mobile", v)} />
                  <Input label="Password" type="password" value={regForm.password} onChange={(v) => updateReg("password", v)} />
                </>
              )}
              {onboard === 2 && (
                <div className="rounded-3xl bg-accent p-5">
                  <BadgeCheck className="text-primary" />
                  <p className="mt-4 font-bold">Identity verification in progress</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">We match your details securely with approved identity sources. Your information remains protected.</p>
                </div>
              )}
              {onboard === 3 && (
                <>
                  <Input label="Emergency contact" value={regForm.emergencyContactName} onChange={(v) => updateReg("emergencyContactName", v)} />
                  <Input label="Relationship" value={regForm.emergencyContactRelationship} onChange={(v) => updateReg("emergencyContactRelationship", v)} />
                  <Input label="Allergies (optional)" value={regForm.allergies} onChange={(v) => updateReg("allergies", v)} />
                  <Input label="Blood type (optional)" value={regForm.bloodType} onChange={(v) => updateReg("bloodType", v)} />
                  <p className="text-xs leading-5 text-muted-foreground">Self-declared, for emergencies only. In the real product this stays on your own device.</p>
                </>
              )}
              {onboard === 4 && (
                <div className="rounded-3xl bg-muted p-5">
                  <Lock className="text-primary" />
                  <p className="mt-4 font-bold">You control who can access your healthcare information.</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Review and change access permissions at any time. CLANCLAST only connects information that is authorised for sharing.</p>
                </div>
              )}
              <ErrorNote message={error} />
              <button
                disabled={busy || !stepValid}
                onClick={() => (onboard === 4 ? submitRegistration() : setOnboard(onboard + 1))}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {busy && <Spinner />}{onboard === 4 ? "Agree and continue" : "Continue"}
              </button>
            </div>
          ) : (
            <div className="mt-8 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent text-primary"><CheckCircle2 size={34} /></div>
              <p className="mt-5 font-bold">{profile?.fullName}</p>
              <p className="font-mono text-xs text-muted-foreground">{profile?.ccId}</p>
              <QR className="mx-auto mt-6 w-40" /><PillStatus>Identity verified</PillStatus>
              <button onClick={() => setView("home")} className="mt-6 w-full rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground">View My Health Passport</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const content: Record<string, React.ReactNode> = {
    home: <PatientHome go={setView} open={setModal} profile={profile} passport={passport} loading={dataLoading} />,
    passport: <Passport go={setView} passport={passport} />,
    summaries: <Summaries open={(k, item) => { setActiveSummary(item); setModal(k); }} summaries={summaries} />,
    team: <Team go={setView} team={team} />,
    consent: <ConsentView consent={consent} respond={respondToConsent} busy={busy} open={setModal} />,
    profile: <Profile go={setView} signOut={signOut} settings={settings} />,
    "connect-provider": <ConnectProvider go={setView} organizations={organizations} connect={connectToOrganization} busy={busy} error={error} />,
    "profile-personal": <ProfilePersonal go={setView} settings={settings} save={saveSettings} busy={busy} error={error} />,
    "profile-privacy": <ProfilePrivacy go={setView} settings={settings} save={saveSettings} busy={busy} />,
    "profile-access-log": <ProfileAccessLog go={setView} />,
    "profile-caregivers": <ProfileCaregivers go={setView} caregivers={caregivers} add={addCaregiver} remove={removeCaregiver} busy={busy} error={error} />,
    "profile-notifications": <ProfileNotificationPrefs go={setView} settings={settings} save={saveSettings} busy={busy} />,
    "profile-language": <ProfileLanguage go={setView} settings={settings} save={saveSettings} busy={busy} />,
    "profile-accessibility": <ProfileAccessibility go={setView} settings={settings} save={saveSettings} busy={busy} />,
    qr: <QRCode go={setView} open={setModal} profile={profile} qrUrl={qrUrl} />,
    notifications: <Notifications notifications={notifications} />,
  };

  return (
    <div className={`min-h-screen cc-canvas p-0 md:grid md:place-items-center md:p-5 ${settings?.largeText ? "text-[17px]" : ""}`}>
      <div className="relative min-h-screen w-full bg-background md:min-h-[760px] md:max-w-[430px] md:overflow-hidden md:rounded-[34px] md:shadow-2xl">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-white/90 px-6 py-4 backdrop-blur">
          <button onClick={() => setContext("landing")}><Brand /></button>
          <button onClick={() => setView("notifications")} className="relative rounded-full bg-muted p-2.5"><Bell size={18} />{notifications.some((n) => !n.read) && <i className="absolute right-2 top-2 h-2 w-2 rounded-full bg-critical" />}</button>
        </div>
        <div className="px-5 pb-24 pt-5">{content[view] || content.home}</div>
        <nav className="absolute bottom-0 left-0 right-0 flex justify-around border-t border-border bg-card px-2 py-3">
          {patientNav.map(([label, Icon]) => {
            const target = label === "Health Passport" ? "passport" : (label as string).toLowerCase();
            const active = view === target || (target === "profile" && view.startsWith("profile")) || (target === "team" && view === "connect-provider");
            return (
              <button key={label} onClick={() => setView(target)} className={`grid min-w-12 place-items-center gap-1 text-[9px] font-bold ${active ? "text-primary" : "text-muted-foreground"}`}>
                <Icon size={19} />{label}
              </button>
            );
          })}
        </nav>
      </div>
      {modal && <PatientModal kind={modal} close={() => setModal("")} activeSummary={activeSummary} profile={profile} goUssd={() => setContext("ussd")} />}
    </div>
  );
}

function PatientHome({ go, open, profile, passport, loading }: { go: (s: string) => void; open: (s: string) => void; profile: PatientProfile | null; passport: any; loading: boolean }) {
  const completion = passport?.patient?.passportCompletion ?? profile?.passportCompletion ?? 0;
  const ei = passport?.emergencyInformation;
  const firstName = (profile?.fullName || "there").split(" ")[0];
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  return (
    <>
      <p className="text-sm text-muted-foreground">{today}</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold">Good morning, {firstName}</h1>
      <section className="mt-6 overflow-hidden rounded-[27px] cc-hero p-5 text-white">
        <div className="flex justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.15em] text-brand-300">Health Passport</p>
            <p className="mt-2 font-display text-4xl font-extrabold">{loading ? "…" : completion}<span className="text-xl">%</span></p>
            <p className="text-sm text-white/65">Complete & ready to share</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10"><Shield size={25} /></div>
        </div>
        <div className="mt-5 h-2 rounded-full bg-white/15"><div className="h-full rounded-full bg-brand-500" style={{ width: `${completion}%` }} /></div>
        <button onClick={() => go("passport")} className="mt-5 flex items-center gap-2 text-xs font-bold text-brand-200">View health passport <ChevronRight size={14} /></button>
      </section>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Action icon={<QrCode />} label="Show my QR code" onClick={() => go("qr")} />
        <Action icon={<FileText />} label="Signed summaries" onClick={() => go("summaries")} />
        <Action icon={<Users />} label="Healthcare team" onClick={() => go("team")} />
        <Action icon={<Lock />} label="Manage consent" onClick={() => go("consent")} />
      </div>
      <section className="mt-6 rounded-[24px] border border-critical/25 bg-critical-tint p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-critical-tint p-2.5 text-critical"><HeartPulse size={20} /></div>
          <div><p className="font-bold">Emergency information</p><PillStatus tone="green">Verified information</PillStatus></div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Mini label="Blood type" value={ei?.bloodType || "—"} />
          <Mini label="Allergy" value={ei?.allergies || "—"} />
          <Mini label="Contact" value={ei?.emergencyContactName?.split(" ")[0] || "—"} />
        </div>
      </section>
      <button onClick={() => open("demo")} className="mt-5 flex w-full items-center justify-between rounded-2xl bg-accent p-4 text-left">
        <span><b className="block text-sm">No smartphone? Still connected.</b><span className="text-xs text-muted-foreground">Card, USSD, SMS & caregiver access</span></span>
        <ChevronRight className="text-primary" />
      </button>
    </>
  );
}

function Action({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-[21px] border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/30">
      <span className="mb-5 block text-primary">{icon}</span>
      <span className="text-xs font-bold leading-4">{label}</span>
    </button>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card p-2">
      <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs font-bold">{value}</p>
    </div>
  );
}

function Header({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-3xl font-extrabold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

function List({ title, icon, rows }: { title: string; icon: React.ReactNode; rows: string[] }) {
  return (
    <section className="mt-4 rounded-[22px] border border-border bg-card p-4">
      <div className="flex gap-3 text-primary"><span className="rounded-xl bg-muted p-2">{icon}</span><p className="pt-1 text-sm font-bold text-foreground">{title}</p></div>
      <div className="mt-3 divide-y divide-border">
        {rows.length === 0 && <p className="py-3 text-xs text-muted-foreground">Nothing here yet.</p>}
        {rows.map((r) => <div key={r} className="flex items-center justify-between py-3 text-xs font-medium"><span>{r}</span><BadgeCheck size={15} className="text-primary" /></div>)}
      </div>
    </section>
  );
}

function CredentialsList({ credentials }: { credentials: any[] }) {
  const [qrCredential, setQrCredential] = useState<any>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [loadingId, setLoadingId] = useState("");

  async function showCode(c: any) {
    setLoadingId(c.id);
    try {
      const url = await patientApi.fetchCredentialQr(c.id);
      setQrUrl(url);
      setQrCredential(c);
    } catch { /* ignore */ } finally {
      setLoadingId("");
    }
  }

  return (
    <>
      <section className="mt-4 rounded-[22px] border border-border bg-card p-4">
        <div className="flex gap-3 text-primary"><span className="rounded-xl bg-muted p-2"><FileCheck2 /></span><p className="pt-1 text-sm font-bold text-foreground">Health credentials</p></div>
        <div className="mt-3 divide-y divide-border">
          {credentials.length === 0 && <p className="py-3 text-xs text-muted-foreground">Nothing here yet.</p>}
          {credentials.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-3 text-xs font-medium">
              <div>
                <p>{c.type} · {c.status}</p>
                {c.status?.toLowerCase() !== "revoked" && (
                  <button disabled={loadingId === c.id} onClick={() => showCode(c)} className="mt-0.5 font-bold text-primary disabled:opacity-60">{loadingId === c.id ? "Loading…" : "Show verification code"}</button>
                )}
              </div>
              {c.status?.toLowerCase() === "revoked" ? <X size={15} className="text-critical" /> : <BadgeCheck size={15} className="text-primary" />}
            </div>
          ))}
        </div>
      </section>
      {qrCredential && (
        <Modal title={`Verification code · ${qrCredential.type}`} close={() => setQrCredential(null)}>
          <div className="text-center">
            <QR className="mx-auto w-56" src={qrUrl} />
            <p className="mt-4 text-xs leading-5 text-muted-foreground">Anyone can scan this at CLANCLAST Verify to confirm this credential is genuine and still valid — without seeing any of your other information.</p>
            <div className="mt-4 rounded-xl bg-muted px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">No scanner? Enter this reference manually</p>
              <p className="mt-1 select-all break-all font-mono text-xs font-bold">{qrCredential.id}</p>
            </div>
          </div>
          <button onClick={() => setQrCredential(null)} className="mt-5 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground">Done</button>
        </Modal>
      )}
    </>
  );
}

function Passport({ go, passport }: { go: (s: string) => void; passport: any }) {
  const p = passport?.patient;
  const ei = passport?.emergencyInformation;
  const emergencyRows = [
    ei?.allergies ? `${ei.allergies} allergy` : null,
    ei?.emergencyContactName ? `${ei.emergencyContactName}${ei.emergencyContactRelationship ? ` · ${ei.emergencyContactRelationship}` : ""}` : null,
    ei?.bloodType ? `Blood type ${ei.bloodType}` : null,
  ].filter(Boolean) as string[];
  const teamRows = (passport?.careTeam || []).map((m: any) => `${m.label} · ${m.role}`);
  const credentialRows = (passport?.credentials || []).map((c: any) => `${c.type} · ${c.status}`);

  return (
    <>
      <Header title="Health Passport" sub="Your trusted health identity" />
      <section className="rounded-[24px] cc-canvas p-5">
        <div className="flex gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-card text-primary"><User size={22} /></div>
          <div>
            <p className="font-bold">{p?.fullName || "—"}</p>
            <p className="font-mono text-[11px] text-muted-foreground">{p?.ccId || "—"}</p>
            <PillStatus>{p?.identityVerified ? "Verified identity" : "Pending verification"}</PillStatus>
          </div>
        </div>
      </section>
      <List title="Emergency information" icon={<HeartPulse />} rows={emergencyRows} />
      <List title="Healthcare team" icon={<Users />} rows={teamRows} />
      <CredentialsList credentials={passport?.credentials || []} />
      <button onClick={() => go("consent")} className="mt-4 w-full rounded-2xl border border-border bg-card px-4 py-4 text-left text-sm font-bold">
        {passport?.activePermissions ?? 0} active permission{(passport?.activePermissions ?? 0) === 1 ? "" : "s"} <span className="float-right text-primary">Manage</span>
      </button>
    </>
  );
}

function QRCode({ go, open, profile, qrUrl }: { go: (s: string) => void; open: (s: string) => void; profile: PatientProfile | null; qrUrl: string }) {
  const [downloading, setDownloading] = useState(false);
  async function download() {
    if (!profile) return;
    setDownloading(true);
    try { await patientApi.downloadHealthCard(profile.ccId); } catch { /* surfaced via demo modal if this fails repeatedly */ } finally { setDownloading(false); }
  }
  return (
    <div className="pt-4 text-center">
      <button onClick={() => go("home")} className="mr-auto flex items-center gap-2 text-sm font-bold text-muted-foreground"><ArrowLeft size={17} />Home</button>
      <p className="mt-9 text-xs font-bold uppercase tracking-[.18em] text-primary">CLANCLAST ID</p>
      <h1 className="mt-2 font-display text-2xl font-extrabold">{profile?.fullName || "—"}</h1>
      <PillStatus>Identity verified</PillStatus>
      <QR className="mx-auto mt-9 w-64 shadow-[0_15px_35px_-18px_rgba(7,43,39,.35)]" src={qrUrl} />
      <p className="mt-6 font-mono text-sm text-muted-foreground">{profile?.ccId || "—"}</p>
      <p className="mx-auto mt-5 max-w-xs text-sm leading-6 text-muted-foreground">Show this QR code to a participating healthcare provider to help identify you quickly. It refreshes every 5 minutes.</p>
      <div className="mt-7 grid grid-cols-2 gap-3">
        <button onClick={() => open("brightness")} className="rounded-2xl bg-muted py-3 text-xs font-bold">Brightness mode</button>
        <button onClick={() => open("share")} className="rounded-2xl bg-primary py-3 text-xs font-bold text-primary-foreground">Share ID</button>
      </div>
      <button disabled={downloading} onClick={download} className="mt-3 w-full rounded-2xl border border-primary py-3 text-xs font-bold text-primary disabled:opacity-60">{downloading ? "Preparing…" : "Download Health Card (PDF)"}</button>
      <button onClick={() => open("demo")} className="mt-6 text-sm font-bold text-primary">I do not have a smartphone</button>
    </div>
  );
}

function Summaries({ open, summaries }: { open: (kind: string, item: any) => void; summaries: any[] }) {
  return (
    <>
      <Header title="Signed summaries" sub="Issued by your institutions, carried by you." />
      <div className="rounded-2xl bg-accent p-4 text-xs leading-5 text-accent-foreground"><Wifi className="mb-2" size={18} />CLANCLAST does not hold clinical records. Each institution keeps its own records; a signed summary only shows who issued it, which version it is and when, so it can be checked even offline.</div>
      <div className="mt-4 space-y-3">
        {summaries.length === 0 && <p className="text-sm text-muted-foreground">No signed summaries yet.</p>}
        {summaries.map((r) => (
          <button key={r.id} onClick={() => open("summary", r)} className="flex w-full items-center gap-3 rounded-[20px] border border-border bg-card p-4 text-left">
            <div className="rounded-xl bg-muted p-2.5 text-primary"><FileCheck2 size={18} /></div>
            <div className="flex-1">
              <p className="text-sm font-bold">{r.title}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{r.issuer} · version {r.version} · {new Date(r.issuedAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right"><PillStatus>{r.verified ? "Signature valid" : "Unverified"}</PillStatus><ChevronRight className="ml-auto mt-2 text-muted-foreground" size={15} /></div>
          </button>
        ))}
      </div>
    </>
  );
}

function Team({ go, team }: { go: (s: string) => void; team: any[] }) {
  return (
    <>
      <Header title="Healthcare team" sub="Your connected care network" />
      <div className="space-y-3">
        {team.length === 0 && <p className="text-sm text-muted-foreground">No connections yet.</p>}
        {team.map((m, i) => (
          <div className="flex items-center gap-3 rounded-[20px] border border-border bg-card p-4" key={m.id}>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-muted text-primary">{m.role?.toLowerCase().includes("care") ? <Stethoscope size={19} /> : <Building2 size={19} />}</div>
            <div className="flex-1"><p className="text-sm font-bold">{m.label}</p><p className="text-xs text-muted-foreground">{m.role} · connected {new Date(m.connectedAt).toLocaleDateString()}</p></div>
            <PillStatus>{m.status}</PillStatus>
          </div>
        ))}
      </div>
      <button onClick={() => go("connect-provider")} className="mt-5 w-full rounded-2xl border border-primary py-4 text-sm font-bold text-primary">Connect a healthcare provider</button>
    </>
  );
}

function ConnectProvider({ go, organizations, connect, busy, error }: { go: (s: string) => void; organizations: any[]; connect: (organizationId: string) => void; busy: boolean; error: string }) {
  const tone = (s: string) => (s === "CONNECTED" ? "green" : s === "PENDING" ? "amber" : "red");
  return (
    <>
      <button onClick={() => go("team")} className="mb-5 flex items-center gap-2 text-sm font-bold text-muted-foreground"><ArrowLeft size={17} />Team</button>
      <Header title="Connect a provider" sub="Add an organisation to your healthcare team." />
      <div className="space-y-3">
        {organizations.length === 0 && <p className="text-sm text-muted-foreground">Loading organisations…</p>}
        {organizations.map((o) => (
          <div key={o.id} className="flex items-center justify-between rounded-[20px] border border-border bg-card p-4">
            <div>
              <p className="text-sm font-bold">{o.name}</p>
              <div className="mt-1"><PillStatus tone={tone(o.status) as any}>{o.status === "CONNECTED" ? "Operational" : o.status === "PENDING" ? "In implementation" : "Review needed"}</PillStatus></div>
            </div>
            <button disabled={busy} onClick={() => connect(o.id)} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60">Connect</button>
          </div>
        ))}
      </div>
      <ErrorNote message={error} />
      <p className="mt-5 text-xs leading-5 text-muted-foreground">Connecting adds this organisation to your healthcare team. It does not automatically share your records — that still requires you to approve a separate consent request.</p>
    </>
  );
}

function expiryLabel(c: any): string | null {
  if (c.duration === "UNTIL_REVOKED" || !c.expiresAt) return null;
  const ms = new Date(c.expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days <= 1) return "Expires today";
  return `Expires in ${days} days`;
}

function ConsentView({ consent, respond, busy, open }: { consent: any[]; respond: (id: string, action: "approve" | "decline" | "revoke", duration?: any) => void; busy: boolean; open: (s: string) => void }) {
  const pending = consent.filter((c) => c.status === "PENDING");
  const approved = consent.filter((c) => c.status === "APPROVED");
  const history = consent.filter((c) => !["PENDING", "APPROVED"].includes(c.status));

  return (
    <>
      <Header title="Consent" sub="You control access to your healthcare information." />
      {pending.length === 0 && approved.length === 0 && <p className="text-sm text-muted-foreground">No access requests yet.</p>}
      {pending.map((c) => (
        <section key={c.id} className="mb-4 rounded-[23px] border border-warning/25 bg-warning-tint p-5">
          <PillStatus tone="amber">Action required</PillStatus>
          <p className="mt-3 font-bold">{c.organization} is requesting access</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{c.scope.join(", ")}{c.reason ? ` — ${c.reason}` : ""}</p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <button disabled={busy} onClick={() => respond(c.id, "approve", "ONCE")} className="rounded-xl border border-border bg-card py-3 text-[11px] font-bold disabled:opacity-60">Allow once</button>
            <button disabled={busy} onClick={() => respond(c.id, "approve", "SEVEN_DAYS")} className="rounded-xl bg-primary py-3 text-[11px] font-bold text-primary-foreground disabled:opacity-60">Allow 7 days</button>
            <button disabled={busy} onClick={() => respond(c.id, "approve", "UNTIL_REVOKED")} className="rounded-xl border border-border bg-card py-3 text-[11px] font-bold disabled:opacity-60">Until revoked</button>
          </div>
          <button disabled={busy} onClick={() => respond(c.id, "decline")} className="mt-3 w-full py-2 text-xs font-bold text-critical disabled:opacity-60">Decline</button>
        </section>
      ))}
      {approved.map((c) => (
        <section key={c.id} className="mb-4 rounded-[23px] bg-accent p-5">
          <CheckCircle2 className="text-primary" />
          <p className="mt-3 font-bold">Access granted to {c.organization}</p>
          <p className="mt-1 text-sm text-muted-foreground">{c.scope.join(", ")} · {c.duration === "UNTIL_REVOKED" ? "Until revoked" : c.duration === "SEVEN_DAYS" ? "7 days" : "Once"}</p>
          {expiryLabel(c) && <p className="mt-1 text-xs font-bold text-warning">{expiryLabel(c)}</p>}
        </section>
      ))}
      {approved.length > 0 && (
        <section className="mt-5 rounded-[22px] border border-border bg-card p-4">
          <p className="text-sm font-bold">Active access</p>
          {approved.map((c) => (
            <div key={c.id} className="mt-3 border-t border-border py-3">
              <p className="text-sm font-bold">{c.provider}</p>
              <p className="text-xs text-muted-foreground">{c.scope.join(", ")} · {c.duration === "UNTIL_REVOKED" ? "Until revoked" : c.duration}{expiryLabel(c) ? ` · ${expiryLabel(c)}` : ""}</p>
              <button disabled={busy} onClick={() => respond(c.id, "revoke")} className="mt-2 text-xs font-bold text-critical disabled:opacity-60">Revoke access</button>
            </div>
          ))}
        </section>
      )}
      {history.length > 0 && (
        <section className="mt-4 rounded-[22px] border border-border bg-card p-4">
          <p className="text-sm font-bold">Consent history</p>
          {history.map((c) => (
            <p key={c.id} className="mt-3 text-xs text-muted-foreground">{c.organization} · {c.status.toLowerCase()} · {new Date(c.respondedAt || c.createdAt).toLocaleDateString()}</p>
          ))}
        </section>
      )}
    </>
  );
}

function Profile({ go, signOut, settings }: { go: (s: string) => void; signOut: () => void; settings: any }) {
  const rows: [string, string][] = [
    ["Personal information", "profile-personal"],
    ["Privacy & consent preferences", "profile-privacy"],
    ["Data access log", "profile-access-log"],
    ["Caregiver access", "profile-caregivers"],
    ["Notification preferences", "profile-notifications"],
    [`Language: ${settings?.language || "English"}`, "profile-language"],
    ["Accessibility", "profile-accessibility"],
  ];
  return (
    <>
      <Header title="Profile & access" sub="Personal settings and inclusive access" />
      <div className="space-y-2">
        {rows.map(([label, target]) => (
          <button key={target} onClick={() => go(target)} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-sm font-bold">{label}<ChevronRight size={17} className="text-muted-foreground" /></button>
        ))}
      </div>
      <button onClick={signOut} className="mt-4 w-full rounded-2xl border border-border bg-card p-4 text-sm font-bold text-critical">Sign out</button>
    </>
  );
}

function ProfileBack({ go, title, sub }: { go: (s: string) => void; title: string; sub: string }) {
  return (
    <>
      <button onClick={() => go("profile")} className="mb-5 flex items-center gap-2 text-sm font-bold text-muted-foreground"><ArrowLeft size={17} />Profile</button>
      <Header title={title} sub={sub} />
    </>
  );
}

function ProfilePersonal({ go, settings, save, busy, error }: { go: (s: string) => void; settings: any; save: (p: Record<string, unknown>) => void; busy: boolean; error: string }) {
  const [form, setForm] = useState({ email: "", allergies: "", bloodType: "", emergencyContactName: "", emergencyContactRelationship: "" });
  const [loaded, setLoaded] = useState(false);
  if (settings && !loaded) {
    setForm({
      email: settings.email || "", allergies: settings.allergies || "", bloodType: settings.bloodType || "",
      emergencyContactName: settings.emergencyContactName || "", emergencyContactRelationship: settings.emergencyContactRelationship || "",
    });
    setLoaded(true);
  }
  return (
    <>
      <ProfileBack go={go} title="Personal information" sub="Keep your details accurate and up to date." />
      <div className="space-y-4">
        <Input label="Email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
        <Input label="Blood type" value={form.bloodType} onChange={(v) => setForm((f) => ({ ...f, bloodType: v }))} />
        <Input label="Allergies" value={form.allergies} onChange={(v) => setForm((f) => ({ ...f, allergies: v }))} />
        <Input label="Emergency contact" value={form.emergencyContactName} onChange={(v) => setForm((f) => ({ ...f, emergencyContactName: v }))} />
        <Input label="Relationship" value={form.emergencyContactRelationship} onChange={(v) => setForm((f) => ({ ...f, emergencyContactRelationship: v }))} />
      </div>
      <ErrorNote message={error} />
      <button disabled={busy} onClick={() => save(form)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground disabled:opacity-60">{busy && <Spinner />}Save changes</button>
    </>
  );
}

function ProfilePrivacy({ go, settings, save, busy }: { go: (s: string) => void; settings: any; save: (p: Record<string, unknown>) => void; busy: boolean }) {
  const options: [string, string][] = [["ONCE", "Allow once, by default"], ["SEVEN_DAYS", "Allow 7 days, by default"], ["UNTIL_REVOKED", "Allow until revoked, by default"]];
  return (
    <>
      <ProfileBack go={go} title="Privacy & consent preferences" sub="Set your preferred default when approving access requests." />
      <div className="space-y-3">
        {options.map(([value, label]) => (
          <button key={value} disabled={busy} onClick={() => save({ defaultConsentDuration: value })} className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left text-sm font-bold disabled:opacity-60 ${settings?.defaultConsentDuration === value ? "border-primary bg-accent text-primary" : "border-border bg-card"}`}>
            {label}{settings?.defaultConsentDuration === value && <Check size={17} />}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">This only sets your preselected option on the consent screen — you'll always be able to choose differently for any individual request.</p>
    </>
  );
}

function ProfileAccessLog({ go }: { go: (s: string) => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    patientApi.accessLog().then(setLogs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function acknowledge(id: string) {
    setBusyId(id);
    try {
      await patientApi.acknowledgeAccess(id);
      setLogs((ls) => ls.map((l) => (l.id === id ? { ...l, acknowledgedByPatient: true } : l)));
    } catch { /* ignore */ } finally { setBusyId(""); }
  }

  return (
    <>
      <ProfileBack go={go} title="Data access log" sub="Who has looked at your information, and when." />
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && logs.length === 0 && <p className="text-sm text-muted-foreground">No access recorded yet.</p>}
      <div className="space-y-3">
        {logs.map((l) => (
          <div key={l.id} className={`rounded-2xl border p-4 ${l.isEmergency ? "border-critical/25 bg-critical-tint" : "border-border bg-card"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold">{l.provider} <span className="font-medium text-muted-foreground">· {l.organization}</span></p>
                <p className="mt-1 text-xs text-muted-foreground">{l.action} · {new Date(l.createdAt).toLocaleString()}</p>
              </div>
              {l.isEmergency && <span className="shrink-0 rounded-full bg-critical/15 px-2.5 py-1 text-[10px] font-bold text-critical">Emergency access</span>}
            </div>
            {l.isEmergency && (
              <div className="mt-3 border-t border-critical/25 pt-3">
                <p className="text-xs text-critical"><b>Reason given:</b> {l.reason}</p>
                {l.acknowledgedByPatient ? (
                  <p className="mt-2 text-xs font-bold text-critical">✓ You've reviewed this</p>
                ) : (
                  <button disabled={busyId === l.id} onClick={() => acknowledge(l.id)} className="mt-2 rounded-lg bg-critical px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">Mark as reviewed</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function ProfileCaregivers({ go, caregivers, add, remove, busy, error }: { go: (s: string) => void; caregivers: any[]; add: (p: { name: string; relationship: string; phone?: string; pin?: string }) => void; remove: (id: string) => void; busy: boolean; error: string }) {
  const [form, setForm] = useState({ name: "", relationship: "", phone: "", pin: "" });
  const wantsSignIn = form.phone.length > 0;
  return (
    <>
      <ProfileBack go={go} title="Caregiver access" sub="People you trust to help manage your care." />
      <div className="space-y-3">
        {caregivers.length === 0 && <p className="text-sm text-muted-foreground">No caregivers added yet.</p>}
        {caregivers.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-[20px] border border-border bg-card p-4">
            <div>
              <p className="text-sm font-bold">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.relationship}{c.phone ? ` · ${c.phone}` : ""}</p>
              {c.canSignIn && <p className="mt-1 text-[11px] font-bold text-primary">Can sign in on your behalf</p>}
            </div>
            <button disabled={busy} onClick={() => remove(c.id)} className="text-xs font-bold text-critical disabled:opacity-60">Remove</button>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-[23px] border border-border bg-card p-5">
        <p className="font-bold">Add a caregiver</p>
        <div className="mt-4 space-y-4">
          <Input label="Full name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
          <Input label="Relationship" value={form.relationship} onChange={(v) => setForm((f) => ({ ...f, relationship: v }))} />
          <Input label="Phone (optional)" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
          {wantsSignIn && <Input label="Sign-in PIN (4–6 digits, for this caregiver)" value={form.pin} onChange={(v) => setForm((f) => ({ ...f, pin: v.replace(/\D/g, "").slice(0, 6) }))} />}
        </div>
        {wantsSignIn && <p className="mt-2 text-xs leading-5 text-muted-foreground">Adding a phone and PIN lets this person sign in separately at "Caregiver sign in" and act on your behalf for consent requests.</p>}
        <ErrorNote message={error} />
        <button disabled={busy || !form.name || !form.relationship || (wantsSignIn && form.pin.length < 4)} onClick={() => { add(form.pin ? form : { name: form.name, relationship: form.relationship, phone: form.phone || undefined }); setForm({ name: "", relationship: "", phone: "", pin: "" }); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60">{busy && <Spinner />}Add caregiver</button>
      </div>
    </>
  );
}

function ProfileNotificationPrefs({ go, settings, save, busy }: { go: (s: string) => void; settings: any; save: (p: Record<string, unknown>) => void; busy: boolean }) {
  const toggles: [string, string][] = [["notifyActionRequired", "Action required"], ["notifyImportant", "Important"], ["notifyInformational", "Informational"]];
  return (
    <>
      <ProfileBack go={go} title="Notification preferences" sub="Choose which categories you want to hear about." />
      <div className="space-y-3">
        {toggles.map(([key, label]) => {
          const on = settings?.[key] ?? true;
          return (
            <button key={key} disabled={busy} onClick={() => save({ [key]: !on })} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left text-sm font-bold disabled:opacity-60">
              {label}
              <span className={`grid h-6 w-11 items-center rounded-full p-1 transition ${on ? "bg-primary" : "bg-muted"}`}><span className={`h-4 w-4 rounded-full bg-card transition ${on ? "translate-x-5" : ""}`} /></span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function ProfileLanguage({ go, settings, save, busy }: { go: (s: string) => void; settings: any; save: (p: Record<string, unknown>) => void; busy: boolean }) {
  const languages = ["English", "Afrikaans", "isiZulu", "isiXhosa", "Sesotho"];
  return (
    <>
      <ProfileBack go={go} title="Language" sub="Choose the language CLANCLAST uses with you." />
      <div className="space-y-3">
        {languages.map((l) => (
          <button key={l} disabled={busy} onClick={() => save({ language: l })} className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left text-sm font-bold disabled:opacity-60 ${settings?.language === l ? "border-primary bg-accent text-primary" : "border-border bg-card"}`}>
            {l}{settings?.language === l && <Check size={17} />}
          </button>
        ))}
      </div>
    </>
  );
}

function ProfileAccessibility({ go, settings, save, busy }: { go: (s: string) => void; settings: any; save: (p: Record<string, unknown>) => void; busy: boolean }) {
  const on = settings?.largeText ?? false;
  return (
    <>
      <ProfileBack go={go} title="Accessibility" sub="Adjust CLANCLAST to be easier for you to use." />
      <button disabled={busy} onClick={() => save({ largeText: !on })} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left text-sm font-bold disabled:opacity-60">
        <span>Larger text throughout the app<span className="mt-1 block text-xs font-medium text-muted-foreground">Increases the base text size across every screen.</span></span>
        <span className={`grid h-6 w-11 shrink-0 items-center rounded-full p-1 transition ${on ? "bg-primary" : "bg-muted"}`}><span className={`h-4 w-4 rounded-full bg-card transition ${on ? "translate-x-5" : ""}`} /></span>
      </button>
    </>
  );
}

function Notifications({ notifications }: { notifications: any[] }) {
  const tone = (cat: string) => (cat === "ACTION_REQUIRED" ? "amber" : cat === "IMPORTANT" ? "red" : "green");
  const label = (cat: string) => (cat === "ACTION_REQUIRED" ? "Action required" : cat === "IMPORTANT" ? "Important" : "Informational");
  return (
    <>
      <Header title="Notifications" sub="The latest from your healthcare network" />
      {notifications.length === 0 && <p className="text-sm text-muted-foreground">You're all caught up.</p>}
      {notifications.map((n) => (
        <div key={n.id} className="mb-3 rounded-2xl border border-border bg-card p-4">
          <PillStatus tone={tone(n.category) as any}>{label(n.category)}</PillStatus>
          <p className="mt-2 text-sm font-bold">{n.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
        </div>
      ))}
    </>
  );
}

function PatientModal({ kind, close, activeSummary, profile, goUssd }: { kind: string; close: () => void; activeSummary: any; profile: PatientProfile | null; goUssd: () => void }) {
  if (kind === "summary" && activeSummary) {
    return (
      <Modal title={activeSummary.title} close={close}>
        <div className="grid gap-2 text-sm">
          <p><b>Issued by:</b> {activeSummary.issuer}</p>
          <p><b>Version:</b> {activeSummary.version}</p>
          <p><b>Date:</b> {new Date(activeSummary.issuedAt).toLocaleDateString()}</p>
          <p><b>Signature:</b> valid (simulated)</p>
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">The clinical content stays with the issuing institution. This demo shows only what the summary would prove: who issued it, which version and when.</p>
        <button onClick={close} className="mt-6 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground">Done</button>
      </Modal>
    );
  }
  if (kind === "demo") {
    return <NoSmartphoneModal close={close} profile={profile} goUssd={goUssd} />;
  }
  const text: Record<string, [string, string]> = {
    brightness: ["Brightness mode on", "Your screen brightness would increase so the QR code is easier to scan."],
    share: ["Share CLANCLAST ID", "Your identity code can be shared securely with a participating provider."],
    connect: ["Connect a provider", "Ask a provider to send a connection request, or scan their CLANCLAST Provider QR code."],
    help: ["Help accessing CLANCLAST", "CLANCLAST works beyond smartphones. A trusted provider can help you create or retrieve your identity using a Health Card, USSD or SMS."],
    assist: ["Provider-assisted access", "CLANCLAST works beyond smartphones. A trusted provider can help you create or retrieve your identity using a Health Card, USSD or SMS."],
  };
  const [title, body] = text[kind] || ["Done", "Your changes have been saved."];
  return (
    <Modal title={title} close={close}>
      <p className="text-sm leading-6 text-muted-foreground">{body}</p>
      <button onClick={close} className="mt-6 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground">Done</button>
    </Modal>
  );
}

function NoSmartphoneModal({ close, profile, goUssd }: { close: () => void; profile: PatientProfile | null; goUssd: () => void }) {
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState("");
  async function download() {
    if (!profile) return;
    setDownloading(true); setErr("");
    try { await patientApi.downloadHealthCard(profile.ccId); } catch { setErr("Could not generate your Health Card. Try again."); } finally { setDownloading(false); }
  }
  return (
    <Modal title="Every access channel belongs" close={close}>
      <p className="text-sm leading-6 text-muted-foreground">Use your CLANCLAST Health Card, dial in through USSD, respond by SMS, ask a provider for assistance, or nominate a caregiver.</p>
      <div className="mt-5 space-y-2.5">
        <button disabled={downloading || !profile} onClick={download} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left text-sm font-bold disabled:opacity-60">
          {downloading ? "Preparing your card…" : "Download Health Card (PDF)"}<CreditCard size={17} className="text-primary" />
        </button>
        <button onClick={() => { close(); goUssd(); }} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left text-sm font-bold">
          Try the USSD experience<ChevronRight size={17} className="text-primary" />
        </button>
      </div>
      {err && <p className="mt-3 text-xs font-medium text-critical">{err}</p>}
      <button onClick={close} className="mt-5 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground">Done</button>
    </Modal>
  );
}

function AccessModal({ kind, close }: { kind: string; close: () => void }) {
  return (
    <Modal title={kind === "assist" ? "Provider-assisted access" : "Help accessing CLANCLAST"} close={close}>
      <p className="text-sm leading-6 text-muted-foreground">CLANCLAST works beyond smartphones. A trusted provider can help you create or retrieve your identity using a Health Card, USSD or SMS.</p>
      <div className="mt-5 grid grid-cols-2 gap-2">{["Health Card", "USSD", "SMS", "Caregiver"].map((x) => <div key={x} className="rounded-xl bg-muted p-3 text-center text-xs font-bold text-primary">{x}</div>)}</div>
      <button onClick={close} className="mt-5 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground">Find a participating provider</button>
    </Modal>
  );
}

type ProviderProfile = { fullName: string; role: string; organization: { id: string; name: string; status: string } };

function Provider({ setContext }: { setContext: (c: Context) => void }) {
  const [view, setView] = useState(getToken("provider") ? "dashboard" : "login");
  const [modal, setModal] = useState("");
  const [modalPayload, setModalPayload] = useState<any>(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [providerNotifications, setProviderNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (getToken("provider") && !profile) {
      authApi.me("provider").then((d) => setProfile(d.provider)).catch(() => clearToken("provider"));
    }
  }, []);

  function toggleNotifications() {
    setShowNotifications((s) => {
      const next = !s;
      if (next) providerApi.notifications().then(setProviderNotifications).catch(() => {});
      return next;
    });
  }

  async function updateProviderProfile(payload: { fullName?: string; role?: string }) {
    setBusy(true); setError("");
    try {
      const updated = await providerApi.updateProfile(payload);
      setProfile(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save that change.");
    } finally {
      setBusy(false);
    }
  }

  function notify(kind: string, payload?: any) {
    setModalPayload(payload || null);
    setModal(kind);
  }

  async function submitLogin() {
    setBusy(true); setError("");
    try {
      const { token, provider } = await authApi.providerLogin(loginForm.email, loginForm.password);
      saveToken("provider", token);
      setProfile(provider);
      setView("dashboard");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    clearToken("provider");
    setProfile(null);
    setView("login");
  }

  if (view === "login") {
    return (
      <div className="min-h-screen cc-canvas p-5 lg:grid lg:place-items-center">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] bg-card shadow-2xl lg:grid-cols-[.9fr_1.1fr]">
          <div className="hidden cc-hero p-10 text-white lg:block">
            <Brand dark />
            <p className="mt-28 text-xs font-bold uppercase tracking-[.18em] text-brand-300">Provider workspace</p>
            <h1 className="mt-4 font-display text-5xl font-extrabold leading-[1.02]">Care, connected without a rip-and-replace.</h1>
            <p className="mt-6 max-w-sm text-base leading-7 text-white/65">Secure identity, consent and health-information exchange around the systems your team already uses.</p>
            <div className="mt-20 border-t border-white/15 pt-5 text-sm text-white/60">Organisation verified · South Africa</div>
          </div>
          <div className="p-7 sm:p-12">
            <button onClick={() => setContext("landing")}><Brand /></button>
            <div className="mt-14 max-w-sm">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Secure sign in</p>
              <h1 className="mt-2 font-display text-3xl font-extrabold">Welcome back</h1>
              <p className="mt-2 text-sm text-muted-foreground">Sign in to your provider workspace.</p>
              <div className="mt-8 space-y-4">
                <Input label="Email" value={loginForm.email} onChange={(v) => setLoginForm((f) => ({ ...f, email: v }))} />
                <Input label="Password" type="password" value={loginForm.password} onChange={(v) => setLoginForm((f) => ({ ...f, password: v }))} />
                <div className="rounded-xl border border-primary/20 bg-accent p-3 text-xs text-primary"><KeyRound size={15} className="mr-2 inline" />Demo: dr.naidoo@riverside.demo · Provider123!</div>
                <button disabled={busy} onClick={submitLogin} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-bold text-primary-foreground disabled:opacity-60">{busy && <Spinner />}Sign in securely</button>
                <ErrorNote message={error} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pages: Record<string, React.ReactNode> = {
    dashboard: <ProviderDashboard go={setView} profile={profile} />,
    "check-in": <CheckIn notify={notify} go={setView} />,
    patients: <Patients go={setView} notify={notify} />,
    registration: <Registration notify={notify} />,
    verification: <Verification notify={notify} />,
    referrals: <Referrals notify={notify} />,
    "consent requests": <ProviderConsent notify={notify} />,
    connections: <ProviderConnections go={setContext} />,
    activity: <ActivityLog />,
    settings: <ProviderSettings profile={profile} save={updateProviderProfile} busy={busy} error={error} signOut={signOut} />,
  };

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="hidden w-[250px] shrink-0 flex-col border-r border-white/10 cc-hero px-4 py-7 text-white lg:flex">
        <button onClick={() => setContext("landing")}><Brand dark /></button>
        <div className="mt-10 space-y-1">
          {providerNav.map(([x, Icon]) => (
            <button onClick={() => setView((x as string).toLowerCase())} key={x as string} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${view === (x as string).toLowerCase() ? "bg-white/12 text-white" : "text-white/60 hover:bg-white/5"}`}>
              <Icon size={18} />{x}
            </button>
          ))}
        </div>
        <div className="mt-auto rounded-2xl bg-white/8 p-4">
          <p className="text-xs font-bold text-white">{profile?.organization.name || "—"}</p>
          <p className="mt-1 text-[11px] text-white/55">{profile?.organization.status === "CONNECTED" ? "Verified organisation" : profile?.organization.status}</p>
          <button onClick={signOut} className="mt-3 text-[11px] font-bold text-white/70 underline">Sign out</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-border bg-card px-5 py-4 lg:px-9">
          <div className="flex items-center gap-3 lg:hidden"><button><Menu /></button><Brand /></div>
          <div className="hidden lg:block">
            <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            <p className="font-display text-lg font-extrabold">{profile?.organization.name || "—"}</p>
          </div>
          <div className="flex items-center gap-4">
            <PillStatus>{profile?.organization.status === "CONNECTED" ? "Verified organisation" : profile?.organization.status || ""}</PillStatus>
            <div className="relative">
              <button onClick={toggleNotifications} className="relative rounded-full bg-muted p-2.5"><Bell size={18} />{providerNotifications.length > 0 && <i className="absolute right-2 top-2 h-2 w-2 rounded-full bg-critical" />}</button>
              {showNotifications && (
                <div className="absolute right-0 top-12 z-30 w-80 rounded-2xl border border-border bg-card p-3 shadow-xl">
                  <p className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Recent activity</p>
                  <div className="max-h-80 overflow-y-auto">
                    {providerNotifications.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">Nothing new.</p>}
                    {providerNotifications.map((n) => (
                      <div key={n.id} className="border-t border-border px-2 py-3">
                        <p className="text-xs font-bold">{n.title}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{n.body}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">{new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setView("settings")} className="hidden h-9 w-9 place-items-center rounded-full bg-accent text-sm font-bold text-primary sm:grid">{(profile?.fullName || "").split(" ").map((n) => n[0]).join("").slice(0, 2)}</button>
          </div>
        </header>
        <div className="p-5 lg:p-9">{pages[view] || pages.dashboard}</div>
      </div>
      {modal && <ProviderModal kind={modal} payload={modalPayload} close={() => setModal("")} />}
    </div>
  );
}

function ProviderDashboard({ go, profile }: { go: (s: string) => void; profile: ProviderProfile | null }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { providerApi.dashboard().then(setData).catch(() => {}); }, []);
  const cards = data?.cards || [];
  const icons = [Users, UserCheck, Lock, ShieldAlert];
  const firstName = (profile?.fullName || "").replace(/^Dr\.\s*/, "").split(" ").slice(-1)[0] || profile?.fullName;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm text-muted-foreground">Good morning,</p><h1 className="font-display text-3xl font-extrabold">{profile?.fullName || "…"}</h1></div>
        <div className="flex items-center gap-2">
          <button onClick={() => go("registration")} className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"><Plus className="mr-1 inline" size={16} />Register patient</button>
          <button onClick={() => go("verification")} className="rounded-xl border border-primary/25 bg-card px-4 py-3 text-sm font-bold text-primary"><QrCode className="mr-1 inline" size={16} />Quick scan</button>
        </div>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(cards.length ? cards : [{ label: "Patients connected", value: "…" }, { label: "Pending registrations", value: "…" }, { label: "Consent requests", value: "…" }, { label: "Verification alerts", value: "…" }]).map((c: any, i: number) => {
          const I = icons[i] || Users;
          return <div key={c.label} className="rounded-[22px] border border-border bg-card p-5"><I className="text-primary" size={20} /><p className="mt-7 text-3xl font-bold">{c.value}</p><p className="mt-1 text-sm text-muted-foreground">{c.label}</p></div>;
        })}
      </div>
      <div className="mt-7 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-[25px] border border-border bg-card p-5">
          <div className="flex justify-between">
            <div><h2 className="font-display text-lg font-extrabold">Recent activity</h2><p className="text-sm text-muted-foreground">Priority actions for your team</p></div>
            <button onClick={() => go("activity")} className="text-sm font-bold text-primary">View all</button>
          </div>
          {(data?.recentActivity || []).length === 0 && <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">No activity yet.</p>}
          {(data?.recentActivity || []).map((a: any) => (
            <button onClick={() => a.status?.toLowerCase().includes("consent") && go("consent requests")} className="mt-4 flex w-full items-center gap-3 border-t border-border pt-4 text-left" key={a.id}>
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${a.status?.toLowerCase().includes("required") || a.status?.toLowerCase().includes("pending") ? "bg-warning-tint text-warning" : "bg-muted text-primary"}`}>{a.status?.toLowerCase().includes("pending") || a.status?.toLowerCase().includes("required") ? <Clock size={18} /> : <CheckCircle2 size={18} />}</span>
              <span className="flex-1"><b className="block text-sm">{a.action}</b><span className="text-xs text-muted-foreground">{a.subjectLabel}</span></span>
              <PillStatus tone={a.status?.toLowerCase().includes("required") || a.status?.toLowerCase().includes("pending") ? "amber" : "green"}>{a.status}</PillStatus>
            </button>
          ))}
        </section>
        <section className="rounded-[25px] cc-hero p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[.17em] text-brand-300">Quick actions</p>
          {[["Scan CLANCLAST QR", "verification"], ["Search patient", "patients"], ["Request information", "consent requests"], ["Create referral", "referrals"]].map(([x, v]) => (
            <button key={x} onClick={() => go(v)} className="mt-3 flex w-full items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-left text-sm font-bold hover:bg-white/15">{x}<ArrowRight size={16} /></button>
          ))}
          <p className="mt-6 text-xs leading-5 text-white/55">CLANCLAST layers onto the clinical systems your organisation already uses.</p>
        </section>
      </div>
    </>
  );
}

function Patients({ go, notify }: { go: (s: string) => void; notify: (kind: string, payload?: any) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [credType, setCredType] = useState("");
  const [credStatus, setCredStatus] = useState("Verified");
  const [issuing, setIssuing] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState("");
  const [emergencyResult, setEmergencyResult] = useState<any>(null);
  const [emergencyBusy, setEmergencyBusy] = useState(false);
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestScopes, setRequestScopes] = useState<string[]>([]);
  const [requestReason, setRequestReason] = useState("");
  const [requesting, setRequesting] = useState(false);
  const SCOPE_OPTIONS = ["Signed summaries", "Referral information", "Laboratory results", "Vaccination records", "Emergency information"];

  async function runSearch(q: string) {
    setLoading(true);
    try { setResults(await providerApi.patients(q)); } catch { /* ignore */ } finally { setLoading(false); }
  }
  useEffect(() => { runSearch(""); }, []);

  async function selectPatient(id: string) {
    setDetailLoading(true);
    setEmergencyResult(null); setShowEmergencyForm(false); setEmergencyReason("");
    setShowRequestForm(false); setRequestScopes([]); setRequestReason("");
    try { setSelected(await providerApi.patient(id)); } catch { /* ignore */ } finally { setDetailLoading(false); }
  }

  function toggleScope(s: string) {
    setRequestScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  async function requestAccess() {
    if (!selected || requestScopes.length === 0) return;
    setRequesting(true);
    try {
      await providerApi.requestConsent({ patientId: selected.id, scope: requestScopes, reason: requestReason || undefined });
      notify("request-sent");
      setShowRequestForm(false);
      setRequestScopes([]);
      setRequestReason("");
    } catch (e) {
      notify("error", { message: e instanceof ApiError ? e.message : "Could not request access." });
    } finally {
      setRequesting(false);
    }
  }

  async function useEmergencyAccess() {
    if (!selected || emergencyReason.trim().length < 10) return;
    setEmergencyBusy(true);
    try {
      const result = await providerApi.emergencyAccess(selected.id, emergencyReason.trim());
      setEmergencyResult(result);
      setShowEmergencyForm(false);
    } catch (e) {
      notify("error", { message: e instanceof ApiError ? e.message : "Could not use emergency access." });
    } finally {
      setEmergencyBusy(false);
    }
  }

  async function issueCredential() {
    if (!selected || !credType) return;
    setIssuing(true);
    try {
      await providerApi.issueCredential(selected.id, { type: credType, status: credStatus });
      setCredType("");
      await selectPatient(selected.id);
      notify("credential-issued");
    } catch (e) {
      notify("error", { message: e instanceof ApiError ? e.message : "Could not issue that credential." });
    } finally {
      setIssuing(false);
    }
  }

  const [revokingId, setRevokingId] = useState("");
  async function revokeCred(credentialId: string) {
    if (!selected) return;
    setRevokingId(credentialId);
    try {
      await providerApi.revokeCredential(credentialId);
      await selectPatient(selected.id);
      notify("credential-revoked");
    } catch (e) {
      notify("error", { message: e instanceof ApiError ? e.message : "Could not revoke that credential." });
    } finally {
      setRevokingId("");
    }
  }

  return (
    <>
      <Header title="Patients" sub="Find, verify and connect with a CLANCLAST identity." />
      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3">
          <Search size={18} className="text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, mobile or CLANCLAST ID" className="w-full bg-transparent py-3 text-sm outline-none" />
        </div>
        <button onClick={() => runSearch(query)} className="rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">Search</button>
      </div>
      <div className="mt-4 space-y-2">
        {loading && <p className="text-sm text-muted-foreground">Searching…</p>}
        {!loading && results.length === 0 && <p className="text-sm text-muted-foreground">No patients found.</p>}
        {results.map((p) => (
          <button key={p.id} onClick={() => selectPatient(p.id)} className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left ${selected?.id === p.id ? "border-primary bg-accent" : "border-border bg-card"}`}>
            <span><b className="block text-sm">{p.fullName}</b><span className="font-mono text-xs text-muted-foreground">{p.ccId}</span></span>
            {p.identityVerified && <PillStatus>Verified</PillStatus>}
          </button>
        ))}
      </div>
      {detailLoading && <p className="mt-4 text-sm text-muted-foreground">Loading patient…</p>}
      {selected && !detailLoading && (
        <section className="mt-5 rounded-[24px] border border-border bg-card p-5">
          <div className="flex flex-wrap justify-between gap-3">
            <div><p className="font-display text-xl font-extrabold">{selected.fullName}</p><p className="font-mono text-xs text-muted-foreground">{selected.ccId}</p></div>
            {selected.identityVerified && <PillStatus>Identity verified</PillStatus>}
          </div>
          <div className="mt-5 grid gap-4 border-t border-border pt-5 md:grid-cols-3">
            <Mini label="Identity" value={selected.identityVerified ? "Verified" : "Not yet verified"} />
            <Mini label="Emergency contact" value={selected.emergencyContactName || "—"} />
            <Mini label="Last interaction" value={selected.lastInteraction ? new Date(selected.lastInteraction).toLocaleDateString() : "—"} />
          </div>
          <div className="mt-5 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            {selected.accessGranted ? (
              <><CheckCircle2 className="mr-2 inline text-primary" size={16} /><b className="text-foreground">Consent active.</b> {selected.sharedSummaries || 0} signed summar{selected.sharedSummaries === 1 ? "y" : "ies"} shared. Clinical records stay with the institution that holds them.</>
            ) : (
              <><Lock className="mr-2 inline text-primary" size={16} /><b className="text-foreground">Additional information requires patient consent.</b></>
            )}
          </div>
          <div className="mt-5 flex gap-3">
            <button onClick={() => setShowRequestForm((s) => !s)} className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">{selected.accessGranted ? "Request more access" : "Request access"}</button>
            <button onClick={() => setShowEmergencyForm((s) => !s)} className="ml-auto rounded-xl border border-critical/25 bg-critical-tint px-4 py-3 text-sm font-bold text-critical">Emergency access</button>
          </div>
          {showRequestForm && (
            <div className="mt-3 rounded-2xl border border-border bg-muted p-4">
              <p className="text-xs font-bold text-muted-foreground">Choose what you're requesting access to.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SCOPE_OPTIONS.map((s) => (
                  <button key={s} onClick={() => toggleScope(s)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${requestScopes.includes(s) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}>{s}</button>
                ))}
              </div>
              <textarea value={requestReason} onChange={(e) => setRequestReason(e.target.value)} placeholder="Reason (optional) — e.g. cardiology follow-up" rows={2} className="mt-3 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-medium outline-none" />
              <div className="mt-3 flex gap-2">
                <button disabled={requesting || requestScopes.length === 0} onClick={requestAccess} className="rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60">{requesting ? "Sending…" : "Send request"}</button>
                <button onClick={() => setShowRequestForm(false)} className="rounded-lg border border-border px-4 py-2.5 text-xs font-bold">Cancel</button>
              </div>
            </div>
          )}
          {showEmergencyForm && (
            <div className="mt-3 rounded-2xl border border-critical/25 bg-critical-tint p-4">
              <p className="text-xs font-bold text-critical">Break-glass access bypasses normal consent. It is permanently logged for this patient to review, and cannot be undone.</p>
              <textarea value={emergencyReason} onChange={(e) => setEmergencyReason(e.target.value)} placeholder="Describe the emergency and why immediate access is needed (min. 10 characters)…" rows={3} className="mt-3 w-full rounded-xl border border-critical/25 bg-card px-3.5 py-2.5 text-xs font-medium outline-none" />
              <div className="mt-3 flex gap-2">
                <button disabled={emergencyBusy || emergencyReason.trim().length < 10} onClick={useEmergencyAccess} className="rounded-lg bg-critical px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{emergencyBusy ? "Accessing…" : "Confirm emergency access"}</button>
                <button onClick={() => setShowEmergencyForm(false)} className="rounded-lg border border-critical/25 px-4 py-2.5 text-xs font-bold text-critical">Cancel</button>
              </div>
            </div>
          )}
          {emergencyResult && (
            <div className="mt-3 rounded-2xl border border-critical/25 bg-critical-tint p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-critical">Emergency info (break-glass)</p>
              <p className="mt-2 text-sm"><b>Blood type:</b> {emergencyResult.bloodType || "Not on file"}</p>
              <p className="mt-1 text-sm"><b>Allergies:</b> {emergencyResult.allergies || "Not on file"}</p>
              <p className="mt-1 text-sm"><b>Emergency contact:</b> {emergencyResult.emergencyContactName ? `${emergencyResult.emergencyContactName} (${emergencyResult.emergencyContactRelationship || "—"})` : "Not on file"}</p>
              <p className="mt-3 text-[11px] text-critical">The patient has been notified and this access is recorded in their access log.</p>
            </div>
          )}
          <div className="mt-6 border-t border-border pt-5">
            <p className="text-sm font-bold">Credentials</p>
            {(selected.credentials || []).length === 0 && <p className="mt-2 text-xs text-muted-foreground">No credentials issued yet.</p>}
            {(selected.credentials || []).map((c: any) => (
              <div key={c.id} className="mt-2 flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-xs">
                <span><b>{c.type}</b> · {c.issuer}</span>
                <div className="flex items-center gap-2">
                  <PillStatus tone={c.status.toLowerCase() === "revoked" ? "red" : "green"}>{c.status}</PillStatus>
                  {c.status.toLowerCase() !== "revoked" && (
                    <button disabled={revokingId === c.id} onClick={() => revokeCred(c.id)} className="text-[11px] font-bold text-critical disabled:opacity-60">{revokingId === c.id ? "Revoking…" : "Revoke"}</button>
                  )}
                </div>
              </div>
            ))}
            <div className="mt-4 flex flex-wrap gap-2">
              <input value={credType} onChange={(e) => setCredType(e.target.value)} placeholder="Credential type, e.g. Vaccination record" className="min-w-[220px] flex-1 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20" />
              <select value={credStatus} onChange={(e) => setCredStatus(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-medium outline-none">
                <option>Verified</option>
                <option>Active</option>
                <option>Pending</option>
              </select>
              <button disabled={issuing || !credType} onClick={issueCredential} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60">{issuing ? "Issuing…" : "Issue credential"}</button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function Registration({ notify }: { notify: (kind: string, payload?: any) => void }) {
  const emptyForm = { fullName: "", dateOfBirth: "", nationalId: "", mobile: "", emergencyContactName: "", emergencyContactRelationship: "" };
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function update(key: keyof typeof emptyForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (!form.fullName || !form.dateOfBirth || !form.nationalId || !form.mobile) {
      setError("Full name, date of birth, ID number and mobile number are required.");
      return;
    }
    setBusy(true); setError("");
    try {
      const res = await providerApi.registerPatient(form);
      notify("registered", res);
      setForm(emptyForm);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not register this patient.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header title="Patient registration" sub="Verify an existing CLANCLAST identity or create one with assistance." />
      <div className="grid gap-3 md:grid-cols-2">
        {[[QrCode, "Scan CLANCLAST QR", "Quick identity matching for smartphone users"], [CreditCard, "Scan Health Card", "For cardholders and feature-phone patients"], [Search, "Enter CLANCLAST ID", "Look up a known identity"], [Plus, "Create new identity", "Provider-assisted registration, below"]].map(([I, a, b]: any) => (
          <div key={a} className="rounded-[23px] border border-border bg-card p-5"><I className="text-primary" /><p className="mt-7 font-bold">{a}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{b}</p></div>
        ))}
      </div>
      <div className="mt-6 rounded-[23px] border border-border bg-card p-6">
        <p className="font-bold">Create new identity</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input label="Full name" value={form.fullName} onChange={(v) => update("fullName", v)} />
          <Input label="Date of birth" type="date" value={form.dateOfBirth} onChange={(v) => update("dateOfBirth", v)} />
          <Input label="South African ID number" value={form.nationalId} onChange={(v) => update("nationalId", v)} />
          <Input label="Mobile number" value={form.mobile} onChange={(v) => update("mobile", v)} />
          <Input label="Emergency contact" value={form.emergencyContactName} onChange={(v) => update("emergencyContactName", v)} />
          <Input label="Relationship" value={form.emergencyContactRelationship} onChange={(v) => update("emergencyContactRelationship", v)} />
        </div>
        <ErrorNote message={error} />
        <button disabled={busy} onClick={submit} className="mt-5 flex items-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60">{busy && <Spinner />}Create CLANCLAST identity</button>
      </div>
      <div className="mt-6 rounded-[23px] bg-accent p-5">
        <p className="font-bold text-primary">CLANCLAST helps reduce duplicate registration, verify patient identity and connect authorised information.</p>
        <p className="mt-2 text-sm text-muted-foreground">No smartphone? Use a CLANCLAST Health Card, CLANCLAST ID, USSD verification or provider-assisted registration.</p>
      </div>
    </>
  );
}

function Verification({ notify }: { notify: (kind: string, payload?: any) => void }) {
  const [ccId, setCcId] = useState("CC-4821-1990");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [last, setLast] = useState<any>(null);

  async function verify() {
    setBusy(true); setError("");
    try {
      const res = await providerApi.verify({ ccId });
      setLast(res);
      notify("verified", res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header title="CLANCLAST Verify" sub="Fast, confidence-building checks for care teams." />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[25px] cc-hero p-7 text-white"><QrCode size={29} /><p className="mt-12 font-display text-xl font-extrabold">Scan QR or Health Card</p><p className="mt-2 text-sm text-white/60">Camera scanning isn't available in this demo — enter the CLANCLAST ID below instead.</p></div>
        <div className="rounded-[25px] border border-border bg-card p-7"><BadgeCheck className="text-primary" size={29} /><p className="mt-12 font-display text-xl font-extrabold">Verify a credential</p><p className="mt-2 text-sm text-muted-foreground">Confirm issuer, status and validity.</p></div>
      </div>
      <div className="mt-6 rounded-[23px] border border-border bg-card p-6">
        <label className="text-xs font-bold text-muted-foreground">CLANCLAST ID</label>
        <div className="mt-2 flex gap-2">
          <input value={ccId} onChange={(e) => setCcId(e.target.value)} className="flex-1 rounded-xl border border-border bg-muted px-4 py-3.5 text-sm font-bold outline-none" />
          <button disabled={busy} onClick={verify} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60">{busy && <Spinner />}Verify</button>
        </div>
        <ErrorNote message={error} />
      </div>
      <section className="mt-6 rounded-[23px] border border-border bg-card p-5">
        <p className="text-sm font-bold">Recent verification</p>
        {last ? (
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <div><p className="font-bold">{last.patient.fullName}</p><p className="text-xs text-muted-foreground">{last.method} · {new Date(last.verifiedAt).toLocaleString()}</p></div>
            <PillStatus>Verified</PillStatus>
          </div>
        ) : <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">No verifications yet this session.</p>}
      </section>
    </>
  );
}

function CheckIn({ notify, go }: { notify: (kind: string, payload?: any) => void; go: (s: string) => void }) {
  const [form, setForm] = useState({ fullName: "", dateOfBirth: "", mobile: "", nationalId: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [matches, setMatches] = useState<any[] | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [confirmingId, setConfirmingId] = useState("");
  const [confirmed, setConfirmed] = useState<any>(null);

  async function lookup() {
    if (!form.fullName.trim()) return;
    setBusy(true); setError(""); setConfirmed(null); setDismissed([]);
    try {
      const res = await providerApi.checkinLookup({
        fullName: form.fullName,
        dateOfBirth: form.dateOfBirth || undefined,
        mobile: form.mobile || undefined,
        nationalId: form.nationalId || undefined,
      });
      setMatches(res.matches);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Lookup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(patientId: string) {
    setConfirmingId(patientId);
    try {
      const res = await providerApi.confirmCheckin(patientId);
      setConfirmed(res);
      setMatches(null);
    } catch (e) {
      notify("error", { message: e instanceof ApiError ? e.message : "Could not confirm this match." });
    } finally {
      setConfirmingId("");
    }
  }

  const visibleMatches = (matches || []).filter((m) => !dismissed.includes(m.patientId));
  const autoLink = visibleMatches.find((m) => m.tier === "auto_link");
  const escalated = visibleMatches.filter((m) => m.tier === "escalate");
  const searched = matches !== null;

  return (
    <>
      <Header title="Check-in" sub="Identify a returning patient from what they can tell you — name, DOB, mobile, or ID." />
      <div className="rounded-[23px] border border-border bg-card p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Full name (required)" className="rounded-xl border border-border bg-muted px-4 py-3 text-sm font-medium outline-none sm:col-span-2" />
          <input value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} placeholder="Date of birth (YYYY-MM-DD)" className="rounded-xl border border-border bg-muted px-4 py-3 text-sm font-medium outline-none" />
          <input value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} placeholder="Mobile number" className="rounded-xl border border-border bg-muted px-4 py-3 text-sm font-medium outline-none" />
          <input value={form.nationalId} onChange={(e) => setForm((f) => ({ ...f, nationalId: e.target.value }))} placeholder="National ID / student number" className="rounded-xl border border-border bg-muted px-4 py-3 text-sm font-medium outline-none sm:col-span-2" />
        </div>
        <button disabled={busy || !form.fullName.trim()} onClick={lookup} className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60">{busy && <Spinner />}Look up patient</button>
        <ErrorNote message={error} />
      </div>

      {confirmed && (
        <section className="mt-5 rounded-[23px] border border-primary/20 bg-accent p-6">
          <CheckCircle2 className="text-primary" />
          <p className="mt-3 font-bold">Checked in: {confirmed.fullName}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{confirmed.ccId}</p>
        </section>
      )}

      {searched && !confirmed && (
        <div className="mt-5 space-y-4">
          {autoLink && (
            <section className="rounded-[23px] border border-primary/20 bg-accent p-6">
              <PillStatus tone="green">Likely match</PillStatus>
              <p className="mt-3 font-bold">{autoLink.fullName}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{autoLink.ccId}</p>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">{autoLink.explanation.map((e: string, i: number) => <li key={i}>· {e}</li>)}</ul>
              <button disabled={confirmingId === autoLink.patientId} onClick={() => confirm(autoLink.patientId)} className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60">{confirmingId === autoLink.patientId ? "Confirming…" : "Proceed with this patient"}</button>
            </section>
          )}
          {escalated.length > 0 && (
            <section className="rounded-[23px] border border-warning/25 bg-warning-tint p-6">
              <PillStatus tone="amber">Possible matches — please confirm</PillStatus>
              <p className="mt-2 text-xs text-muted-foreground">None of these were confident enough to auto-select. Check with the patient before proceeding.</p>
              <div className="mt-3 space-y-3">
                {escalated.map((m) => (
                  <div key={m.patientId} className="rounded-xl border border-warning/25 bg-card p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-bold">{m.fullName}</p>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">{m.ccId}</p>
                    <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">{m.explanation.map((e: string, i: number) => <li key={i}>· {e}</li>)}</ul>
                    <div className="mt-3 flex gap-2">
                      <button disabled={confirmingId === m.patientId} onClick={() => confirm(m.patientId)} className="rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60">{confirmingId === m.patientId ? "Confirming…" : "Yes, this is them"}</button>
                      <button onClick={() => setDismissed((d) => [...d, m.patientId])} className="rounded-lg border border-border px-3.5 py-2 text-xs font-bold">Not a match</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {!autoLink && escalated.length === 0 && (
            <section className="rounded-[23px] border border-border bg-card p-6 text-center">
              <p className="font-bold">No existing match found.</p>
              <p className="mt-1 text-sm text-muted-foreground">This is likely a new patient.</p>
              <button onClick={() => go("registration")} className="mt-4 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Register as new patient</button>
            </section>
          )}
        </div>
      )}
    </>
  );
}


function Referrals({ notify }: { notify: (kind: string, payload?: any) => void }) {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [patientId, setPatientId] = useState("");
  const [patientLabel, setPatientLabel] = useState("");
  const [toOrgId, setToOrgId] = useState("");
  const [urgency, setUrgency] = useState("Routine · within 14 days");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { providerApi.connections().then((d) => setOrgs(d.organizations)).catch(() => {}); }, []);

  async function searchPatients(q: string) {
    setPatientQuery(q);
    setPatientLabel("");
    if (q.length < 2) { setPatientResults([]); return; }
    try { setPatientResults(await providerApi.patients(q)); } catch { /* ignore */ }
  }

  async function submit() {
    if (!patientId || !toOrgId || !reason) { setError("Select a patient, receiving organisation and reason."); return; }
    setBusy(true); setError("");
    try {
      await providerApi.createReferral({ patientId, toOrganizationId: toOrgId, reason, urgency });
      notify("referral");
      setReason(""); setPatientId(""); setPatientLabel(""); setPatientQuery(""); setPatientResults([]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not create the referral.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header title="Create referral" sub="Send a secure, consent-led referral to a connected provider." />
      <div className="max-w-2xl rounded-[25px] border border-border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-bold text-muted-foreground">
            Patient
            <input value={patientLabel || patientQuery} onChange={(e) => searchPatients(e.target.value)} placeholder="Search by name or CLANCLAST ID" className="mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20" />
            {patientResults.length > 0 && !patientLabel && (
              <div className="mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                {patientResults.map((p) => (
                  <button type="button" key={p.id} onClick={() => { setPatientId(p.id); setPatientLabel(p.fullName); setPatientResults([]); }} className="block w-full px-3 py-2 text-left text-xs font-semibold hover:bg-muted">{p.fullName} · {p.ccId}</button>
                ))}
              </div>
            )}
          </label>
          <label className="block text-xs font-bold text-muted-foreground">
            Receiving organisation
            <select value={toOrgId} onChange={(e) => setToOrgId(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Select organisation</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4"><Input label="Reason for referral" value={reason} onChange={setReason} /></div>
        <div className="mt-4"><Input label="Urgency" value={urgency} onChange={setUrgency} /></div>
        <div className="mt-4 rounded-xl bg-muted p-4 text-sm"><FileText className="mr-2 inline text-primary" size={17} /><b>Supporting information:</b> shared institution to institution, only after the patient agrees</div>
        <div className="mt-5 flex items-center justify-between rounded-xl bg-warning-tint p-4"><span className="text-sm font-bold">Patient consent required</span><PillStatus tone="amber">Awaiting approval</PillStatus></div>
        <ErrorNote message={error} />
        <button disabled={busy} onClick={submit} className="mt-5 flex items-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60">{busy && <Spinner />}Send consent request</button>
      </div>
    </>
  );
}

function ProviderConsent({ notify }: { notify: (kind: string, payload?: any) => void }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { setRequests(await providerApi.consentRequests()); } catch { /* ignore */ } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function resend(id: string) {
    try { await providerApi.resendConsentRequest(id); notify("resend"); load(); } catch (e) { notify("error", { message: e instanceof ApiError ? e.message : "Could not resend." }); }
  }

  return (
    <>
      <Header title="Consent requests" sub="Respectful, traceable access to information." />
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && requests.length === 0 && <p className="text-sm text-muted-foreground">No requests sent yet.</p>}
      {requests.map((r) => (
        <section key={r.id} className="mb-4 rounded-[25px] border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-display text-xl font-extrabold">{r.patient}</p><p className="text-sm text-muted-foreground">{r.scope.join(" · ")}</p></div>
            {r.status === "APPROVED" ? (
              <PillStatus>Approved{r.duration ? ` · ${r.duration === "UNTIL_REVOKED" ? "until revoked" : r.duration === "SEVEN_DAYS" ? "7 days" : "once"}` : ""}</PillStatus>
            ) : r.status === "PENDING" ? (
              <PillStatus tone="amber">Waiting for approval</PillStatus>
            ) : (
              <PillStatus tone={r.status === "DECLINED" ? "red" : "gray"}>{r.status}</PillStatus>
            )}
          </div>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">Request delivered to the patient's CLANCLAST app, with USSD and SMS fallback available.</p>
          {r.status === "PENDING" && (
            <div className="mt-5 flex gap-3">
              <button onClick={() => resend(r.id)} className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">Resend request</button>
            </div>
          )}
        </section>
      ))}
    </>
  );
}

function ProviderConnections({ go }: { go: (c: Context) => void }) {
  const [data, setData] = useState<{ organizations: any[]; outgoing: any[]; incoming: any[] }>({ organizations: [], outgoing: [], incoming: [] });
  const [detail, setDetail] = useState<any>(null);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  function refresh() {
    providerApi.connections().then(setData).catch(() => {});
  }
  useEffect(refresh, []);

  const tone = (s: string) => (s === "CONNECTED" ? "green" : s === "PENDING" ? "amber" : "red");
  const label = (s: string) => (s === "CONNECTED" ? "Connected" : s === "PENDING" ? "Pending integration" : "Needs attention");


  async function openDetail(id: string) {
    setError("");
    try { setDetail(await providerApi.connectionDetail(id)); } catch { /* ignore */ }
  }

  async function invite(orgId: string) {
    setBusyId(orgId); setError("");
    try {
      await providerApi.inviteConnection({ toOrganizationId: orgId });
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not send that invite.");
    } finally {
      setBusyId("");
    }
  }

  async function respond(id: string, accept: boolean) {
    setBusyId(id);
    try {
      await (accept ? providerApi.acceptConnection(id) : providerApi.declineConnection(id));
      refresh();
    } catch { /* ignore */ } finally { setBusyId(""); }
  }

  async function simulateSync(id: string) {
    setBusyId(id);
    try {
      await providerApi.simulateSync(id);
      await openDetail(id);
    } catch { /* ignore */ } finally { setBusyId(""); }
  }

  if (detail) {
    return (
      <>
        <button onClick={() => setDetail(null)} className="mb-5 flex items-center gap-2 text-sm font-bold text-muted-foreground"><ArrowLeft size={17} />Connections</button>
        <Header title={detail.name} sub={detail.type.charAt(0) + detail.type.slice(1).toLowerCase()} />
        <div className="flex flex-wrap items-center gap-3">
          <PillStatus tone={tone(detail.status) as any}>{label(detail.status)}</PillStatus>
          <span className="text-xs text-muted-foreground">Last checked: {detail.lastSyncedAt ? new Date(detail.lastSyncedAt).toLocaleString() : "Never"}</span>
          <button disabled={busyId === detail.id} onClick={() => simulateSync(detail.id)} className="ml-auto rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60">{busyId === detail.id ? "Checking…" : "Run connection check"}</button>
        </div>
        <div className="mt-6 overflow-hidden rounded-[23px] border border-border bg-card">
          <p className="border-b border-border px-5 py-3 text-sm font-bold">Connection checks</p>
          {detail.syncEvents.length === 0 && <p className="px-5 py-6 text-sm text-muted-foreground">No checks yet.</p>}
          {detail.syncEvents.map((e: any) => (
            <div key={e.id} className="flex items-center justify-between border-t border-border px-5 py-3.5 text-xs">
              <span>{e.message}</span>
              <span className="flex items-center gap-3 text-muted-foreground"><PillStatus tone={e.status === "success" ? "green" : e.status === "warning" ? "amber" : "red"}>{e.status}</PillStatus>{new Date(e.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Connected organisations" sub="CLANCLAST links trusted systems—not replaces them." />
      <div className="grid gap-4 md:grid-cols-3">
        {data.organizations.map((o) => (
          <button key={o.id} onClick={() => openDetail(o.id)} className="rounded-[22px] border border-border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md">
            <Building2 className="text-primary" /><p className="mt-7 font-bold">{o.name}{o.isOwnOrganization && <span className="ml-2 text-xs font-medium text-muted-foreground">(your organisation)</span>}</p>
            <p className="mt-1 text-xs text-muted-foreground">Identity & consent enabled</p>
            <div className="mt-4 flex items-center gap-2"><PillStatus tone={tone(o.status) as any}>{label(o.status)}</PillStatus></div>
            {!o.isOwnOrganization && (
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); invite(o.id); }}
                className="mt-3 inline-block text-xs font-bold text-primary"
              >
                {busyId === o.id ? "Sending…" : "Invite to connect →"}
              </span>
            )}
          </button>
        ))}
      </div>
      <ErrorNote message={error} />

      {(data.incoming.length > 0 || data.outgoing.length > 0) && (
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-bold">Incoming requests</p>
            <div className="space-y-3">
              {data.incoming.length === 0 && <p className="text-xs text-muted-foreground">None right now.</p>}
              {data.incoming.map((c) => (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-sm font-bold">{c.organization}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Requested by {c.requestedBy}{c.message ? ` — ${c.message}` : ""}</p>
                  {c.status === "PENDING" ? (
                    <div className="mt-3 flex gap-2">
                      <button disabled={busyId === c.id} onClick={() => respond(c.id, true)} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60">Accept</button>
                      <button disabled={busyId === c.id} onClick={() => respond(c.id, false)} className="rounded-lg border border-border px-3 py-2 text-xs font-bold disabled:opacity-60">Decline</button>
                    </div>
                  ) : <div className="mt-2"><PillStatus tone={c.status === "ACCEPTED" ? "green" : "red"}>{c.status}</PillStatus></div>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm font-bold">Sent by you</p>
            <div className="space-y-3">
              {data.outgoing.length === 0 && <p className="text-xs text-muted-foreground">None sent yet.</p>}
              {data.outgoing.map((c) => (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-sm font-bold">{c.organization}</p>
                  <div className="mt-2"><PillStatus tone={c.status === "ACCEPTED" ? "green" : c.status === "DECLINED" ? "red" : "amber"}>{c.status}</PillStatus></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <button onClick={() => go("connect")} className="mt-8 text-sm font-bold text-primary">Open CLANCLAST Connect <ArrowRight className="ml-1 inline" size={15} /></button>
    </>
  );
}

function ActivityLog() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { providerApi.activity().then(setRows).catch(() => {}); }, []);
  return (
    <>
      <Header title="Activity log" sub="Every important action is traceable." />
      <div className="overflow-hidden rounded-[23px] border border-border bg-card">
        <div className="grid grid-cols-[1.1fr_1fr_1fr_.55fr] gap-2 bg-muted px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><span>User</span><span>Action</span><span>Subject</span><span>Time</span></div>
        {rows.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground">No activity recorded yet.</p>}
        {rows.map((x) => (
          <div key={x.id} className="grid grid-cols-[1.1fr_1fr_1fr_.55fr] gap-2 border-t border-border px-4 py-4 text-xs"><b>{x.actorLabel}</b><span>{x.action}</span><span className="text-muted-foreground">{x.subjectLabel}</span><span>{new Date(x.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
        ))}
      </div>
    </>
  );
}

function ProviderSettings({ profile, save, busy, error, signOut }: { profile: ProviderProfile | null; save: (p: { fullName?: string; role?: string }) => void; busy: boolean; error: string; signOut: () => void }) {
  const [form, setForm] = useState({ fullName: "", role: "" });
  const [loaded, setLoaded] = useState(false);
  if (profile && !loaded) {
    setForm({ fullName: profile.fullName || "", role: profile.role || "" });
    setLoaded(true);
  }
  return (
    <>
      <Header title="Settings" sub="Your profile and organisation details." />
      <div className="max-w-xl rounded-[23px] border border-border bg-card p-6">
        <p className="font-bold">Your profile</p>
        <div className="mt-4 space-y-4">
          <Input label="Full name" value={form.fullName} onChange={(v) => setForm((f) => ({ ...f, fullName: v }))} />
          <Input label="Role" value={form.role} onChange={(v) => setForm((f) => ({ ...f, role: v }))} />
        </div>
        <ErrorNote message={error} />
        <button disabled={busy} onClick={() => save(form)} className="mt-5 flex items-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60">{busy && <Spinner />}Save changes</button>
      </div>
      <div className="mt-5 max-w-xl rounded-[23px] border border-border bg-card p-6">
        <p className="font-bold">Organisation</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Mini label="Name" value={profile?.organization.name || "—"} />
          <Mini label="Status" value={profile?.organization.status || "—"} />
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">Organisation details are set up with the CLANCLAST team during onboarding.</p>
      </div>
      <button onClick={signOut} className="mt-5 text-sm font-bold text-critical">Sign out</button>
    </>
  );
}

function ProviderModal({ kind, payload, close }: { kind: string; payload: any; close: () => void }) {
  if (kind === "verified" && payload) {
    return (
      <Modal title="Identity Verified" close={close}>
        <p className="text-sm leading-6 text-muted-foreground">{payload.patient.fullName} · {payload.patient.ccId}. Verified via {payload.method} at {new Date(payload.verifiedAt).toLocaleTimeString()}. Trust level: {payload.trustLevel}.</p>
        <button onClick={close} className="mt-6 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground">Done</button>
      </Modal>
    );
  }
  if (kind === "registered" && payload) {
    return (
      <Modal title="Identity created" close={close}>
        <p className="text-sm leading-6 text-muted-foreground">{payload.fullName} now has a CLANCLAST identity: <b className="font-mono">{payload.ccId}</b>. Share this ID or issue a Health Card so they can access care anywhere in the network.</p>
        <button onClick={close} className="mt-6 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground">Done</button>
      </Modal>
    );
  }
  if (kind === "error") {
    return (
      <Modal title="Something went wrong" close={close}>
        <p className="text-sm leading-6 text-critical">{payload?.message || "Please try again."}</p>
        <button onClick={close} className="mt-6 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground">Close</button>
      </Modal>
    );
  }
  const data: Record<string, [string, string]> = {
    "request-sent": ["Request sent to patient", "Sent through the CLANCLAST app with SMS and USSD fallback. You'll be notified as soon as they respond."],
    resend: ["Request resent", "The patient will receive an updated consent request now."],
    referral: ["Consent request sent", "The patient will receive the referral request in the CLANCLAST app, by USSD or by SMS. The referral will send automatically after approval."],
    "credential-issued": ["Credential issued", "The patient can now see this credential in their Health Passport, and has been notified."],
    "credential-revoked": ["Credential revoked", "It will now fail public verification. The patient has been notified."],
  };
  const [t, b] = data[kind] || ["Complete", "Your action has been recorded."];
  return (
    <Modal title={t} close={close}>
      <p className="text-sm leading-6 text-muted-foreground">{b}</p>
      <button onClick={close} className="mt-6 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground">Done</button>
    </Modal>
  );
}

function Connect({ setContext }: { setContext: (c: Context) => void }) {
  const [stats, setStats] = useState<{ connected: number; pending: number; needsAttention: number; total: number } | null>(null);
  useEffect(() => { connectApi.stats().then(setStats).catch(() => {}); }, []);
  const tiles: [string, string, "green" | "amber" | "red"][] = [
    [String(stats?.connected ?? "—").padStart(2, "0"), "Connected organisations", "green"],
    [String(stats?.pending ?? "—").padStart(2, "0"), "Pending integrations", "amber"],
    [String(stats?.needsAttention ?? "—").padStart(2, "0"), "Needs attention", "red"],
  ];
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-5">
        <button onClick={() => setContext("landing")}><Brand /></button>
        <div className="flex items-center gap-5">
          <button onClick={() => setContext("provider")} className="text-sm font-bold text-primary">Open provider workspace</button>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">CLANCLAST Connect</p>
        <h1 className="mt-3 max-w-3xl font-display text-5xl font-extrabold tracking-[-.04em]">The secure connective tissue for healthcare.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">CLANCLAST connects existing systems through identity, consent and trusted exchange. Organisations keep their clinical systems; patients gain continuity.</p>
        <button onClick={() => setContext("onboard")} className="mt-7 rounded-2xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground">Connect your organisation<ArrowRight className="ml-2 inline" size={15} /></button>
        <section className="mt-12 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <div className="relative min-h-[420px] overflow-hidden rounded-[30px] cc-hero p-8 text-white">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-300">Authorised information exchange</p>
            <div className="absolute left-[12%] top-[27%] grid h-24 w-24 place-items-center rounded-full border border-brand-500 bg-[#10322e] text-center text-xs font-bold shadow-[0_0_0_14px_rgba(141,212,202,.08)]">Patient<br />identity</div>
            <div className="absolute right-[12%] top-[15%] grid h-20 w-20 place-items-center rounded-2xl bg-card text-center text-xs font-bold text-primary">Provider<br />consent</div>
            <div className="absolute bottom-[16%] right-[21%] grid h-20 w-20 place-items-center rounded-2xl bg-brand-200 text-center text-xs font-bold text-brand-ink">Connected<br />systems</div>
            <i className="absolute left-[30%] top-[39%] h-px w-[38%] -rotate-[19deg] bg-brand-300" /><i className="absolute left-[29%] top-[47%] h-px w-[39%] rotate-[20deg] bg-brand-300" />
            <p className="absolute bottom-7 left-8 max-w-sm text-sm leading-6 text-white/60">Authorised requests flow through CLANCLAST's consent layer. Clinical records remain with their source organisations.</p>
          </div>
          <div className="space-y-3">
            {tiles.map(([a, b, t]) => (
              <div key={b} className="rounded-[23px] border border-border bg-card p-6">
                <p className="font-display text-4xl font-extrabold">{a}</p>
                <p className="mt-1 font-bold">{b}</p>
                <div className="mt-3"><PillStatus tone={t}>{t === "green" ? "Operational" : t === "amber" ? "In implementation" : "Review needed"}</PillStatus></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function OnboardOrganization({ setContext }: { setContext: (c: Context) => void }) {
  const [form, setForm] = useState({
    organizationName: "", organizationType: "HOSPITAL", contactName: "", contactEmail: "",
    adminFullName: "", adminEmail: "", adminPassword: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setBusy(true); setError("");
    try {
      const res = await connectApi.onboard(form);
      saveToken("provider", res.token);
      setContext("provider");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not onboard that organisation.");
    } finally {
      setBusy(false);
    }
  }

  const orgTypes = ["HOSPITAL", "LABORATORY", "PHARMACY", "CLINIC"];
  const canSubmit = form.organizationName && form.contactName && form.contactEmail && form.adminFullName && form.adminEmail && form.adminPassword.length >= 8;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-5">
        <button onClick={() => setContext("connect")}><Brand /></button>
        <button onClick={() => setContext("connect")} className="text-sm font-bold text-muted-foreground">Cancel</button>
      </header>
      <div className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">CLANCLAST Connect</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-[-.03em]">Connect your organisation.</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">This creates your organisation's CLANCLAST profile (status starts as pending review) and your first administrator login.</p>

        <div className="mt-8 rounded-[23px] border border-border bg-card p-6">
          <p className="font-bold">Organisation details</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Organisation name" value={form.organizationName} onChange={(v) => set("organizationName", v)} />
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Type</label>
              <select value={form.organizationType} onChange={(e) => set("organizationType", e.target.value)} className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20">
                {orgTypes.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <Input label="Contact name" value={form.contactName} onChange={(v) => set("contactName", v)} />
            <Input label="Contact email" value={form.contactEmail} onChange={(v) => set("contactEmail", v)} />
          </div>
        </div>

        <div className="mt-5 rounded-[23px] border border-border bg-card p-6">
          <p className="font-bold">Your administrator login</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Full name" value={form.adminFullName} onChange={(v) => set("adminFullName", v)} />
            <Input label="Email" value={form.adminEmail} onChange={(v) => set("adminEmail", v)} />
            <Input label="Password (min. 8 characters)" value={form.adminPassword} onChange={(v) => set("adminPassword", v)} type="password" />
          </div>
        </div>

        <ErrorNote message={error} />
        <button disabled={busy || !canSubmit} onClick={submit} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground disabled:opacity-60">{busy && <Spinner />}Connect organisation & sign in</button>
      </div>
    </div>
  );
}

function Verify({ setContext }: { setContext: (c: Context) => void }) {
  const [mode, setMode] = useState<"identity" | "credential">("identity");
  const [ccId, setCcId] = useState("CC-4821-1990");
  const [credentialId, setCredentialId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [credResult, setCredResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true); setError(""); setResult(null); setCredResult(null);
    try {
      if (mode === "identity") setResult(await verifyApi.lookup(ccId));
      else setCredResult(await verifyApi.credentialLookup(credentialId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not verify that reference.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen cc-canvas">
      <header className="flex items-center justify-between bg-card px-6 py-5">
        <button onClick={() => setContext("landing")}><Brand /></button>
        <button onClick={() => setContext("provider")} className="text-sm font-bold text-primary">Provider sign in</button>
      </header>
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 lg:grid-cols-[.85fr_1.15fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">CLANCLAST Verify</p>
          <h1 className="mt-3 font-display text-5xl font-extrabold leading-[1.02]">Know who and what you can trust.</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">Verify patients, providers, credentials and consent status with an auditable trust response.</p>
        </div>
        <div className="rounded-[30px] bg-card p-7 shadow-xl">
          <div className="flex gap-2 rounded-2xl bg-muted p-1">
            <button onClick={() => { setMode("identity"); setResult(null); setCredResult(null); setError(""); }} className={`flex-1 rounded-xl py-2.5 text-xs font-bold ${mode === "identity" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Verify an identity</button>
            <button onClick={() => { setMode("credential"); setResult(null); setCredResult(null); setError(""); }} className={`flex-1 rounded-xl py-2.5 text-xs font-bold ${mode === "credential" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Verify a credential</button>
          </div>

          {mode === "identity" ? (
            <>
              <label className="mt-5 block text-xs font-bold text-muted-foreground">CLANCLAST ID</label>
              <div className="mt-2 flex gap-2">
                <input value={ccId} onChange={(e) => setCcId(e.target.value)} className="flex-1 rounded-xl border border-border bg-muted px-4 text-sm font-bold outline-none" />
                <button disabled={busy} onClick={check} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60">{busy && <Spinner />}Verify</button>
              </div>
            </>
          ) : (
            <>
              <label className="mt-5 block text-xs font-bold text-muted-foreground">Credential reference</label>
              <p className="mt-1 text-[11px] text-muted-foreground">Found on a printed certificate, or scan its verification QR code.</p>
              <div className="mt-2 flex gap-2">
                <input value={credentialId} onChange={(e) => setCredentialId(e.target.value)} placeholder="e.g. cred_demo_vaccination" className="flex-1 rounded-xl border border-border bg-muted px-4 text-sm font-bold outline-none" />
                <button disabled={busy || !credentialId} onClick={check} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60">{busy && <Spinner />}Verify</button>
              </div>
            </>
          )}

          <ErrorNote message={error} />

          {result && mode === "identity" && (
            <div className="mt-7 rounded-[23px] bg-accent p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground"><Check size={25} /></div>
                <div><p className="font-display text-xl font-extrabold text-primary">{result.verified ? "Verified" : "Not verified"}</p><p className="text-xs text-accent-foreground">Trust response received just now</p></div>
              </div>
              <div className="mt-5 grid gap-3 border-t border-primary/20 pt-5 text-sm">
                <p><b>What was verified:</b> {result.whatWasVerified}</p>
                <p><b>Issued by:</b> {result.issuedBy}</p>
                <p><b>Method:</b> {result.method}</p>
                <p><b>Consent status:</b> {result.consentStatus}</p>
              </div>
            </div>
          )}

          {credResult && mode === "credential" && (
            <div className={`mt-7 rounded-[23px] p-6 ${credResult.valid ? "bg-accent" : "bg-critical-tint"}`}>
              <div className="flex items-center gap-3">
                <div className={`grid h-12 w-12 place-items-center rounded-full text-primary-foreground ${credResult.valid ? "bg-primary" : "bg-critical"}`}>{credResult.valid ? <Check size={25} /> : <X size={25} />}</div>
                <div>
                  <p className={`font-display text-xl font-extrabold ${credResult.valid ? "text-primary" : "text-critical"}`}>{credResult.valid ? "Valid credential" : credResult.revoked ? "Revoked" : "Not valid"}</p>
                  <p className={`text-xs ${credResult.valid ? "text-accent-foreground" : "text-critical"}`}>Trust response received just now</p>
                </div>
              </div>
              <div className={`mt-5 grid gap-3 border-t pt-5 text-sm ${credResult.valid ? "border-primary/20" : "border-critical/25"}`}>
                <p><b>Credential type:</b> {credResult.credentialType}</p>
                <p><b>Held by:</b> {credResult.holderName}</p>
                <p><b>Issued by:</b> {credResult.issuedBy}</p>
                <p><b>Issued:</b> {new Date(credResult.issuedAt).toLocaleDateString()}</p>
                <p><b>Status:</b> {credResult.status}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type UssdScreen = "mobile" | "pin" | "menu" | "id" | "consent-list" | "consent-detail" | "emergency";

function UssdSimulator({ setContext }: { setContext: (c: Context) => void }) {
  const [screen, setScreen] = useState<UssdScreen>("mobile");
  const [mobile, setMobile] = useState("");
  const [pin, setPin] = useState("");
  const [reply, setReply] = useState("");
  const [session, setSession] = useState<{ token: string; patient: any } | null>(null);
  const [consentList, setConsentList] = useState<any[]>([]);
  const [selectedConsent, setSelectedConsent] = useState<any>(null);
  const [passport, setPassport] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastMessage, setLastMessage] = useState("");

  async function submitPin() {
    setBusy(true); setError("");
    try {
      const res = await ussdApi.login(mobile, pin);
      setSession(res);
      setScreen("menu");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Login failed. Check your mobile number and PIN.");
    } finally {
      setBusy(false);
    }
  }

  async function openMenuOption(n: string) {
    if (!session) return;
    setError(""); setLastMessage("");
    if (n === "1") {
      setScreen("id");
    } else if (n === "2") {
      setBusy(true);
      try {
        const all = await ussdApi.consent(session.token);
        setConsentList(all.filter((c) => c.status === "PENDING"));
        setScreen("consent-list");
      } catch { setError("Could not load requests."); } finally { setBusy(false); }
    } else if (n === "3") {
      setBusy(true);
      try {
        const p = await ussdApi.emergency(session.token);
        setPassport({ emergencyInformation: p });
        setScreen("emergency");
      } catch { setError("Could not load emergency info."); } finally { setBusy(false); }
    } else if (n === "0") {
      endSession();
    } else {
      setError("Invalid option.");
    }
    setReply("");
  }

  function openConsentDetail(n: string) {
    setError("");
    if (n === "0") { setScreen("menu"); setReply(""); return; }
    const idx = parseInt(n, 10) - 1;
    if (idx >= 0 && idx < consentList.length) {
      setSelectedConsent(consentList[idx]);
      setScreen("consent-detail");
    } else setError("Invalid option.");
    setReply("");
  }

  async function respondConsent(n: string) {
    if (!session || !selectedConsent) return;
    if (n === "0") { setScreen("consent-list"); setReply(""); return; }
    setError("");
    if (n !== "1" && n !== "2") { setError("Invalid option."); return; }
    setBusy(true);
    try {
      if (n === "1") {
        await ussdApi.respond(session.token, selectedConsent.id, "approve");
        setLastMessage("Access approved for 7 days.");
      } else {
        await ussdApi.respond(session.token, selectedConsent.id, "decline");
        setLastMessage("Request declined.");
      }
      const all = await ussdApi.consent(session.token);
      setConsentList(all.filter((c) => c.status === "PENDING"));
      setScreen("menu");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "That action failed.");
    } finally {
      setBusy(false);
      setReply("");
    }
  }

  function endSession() {
    setSession(null); setScreen("mobile"); setMobile(""); setPin("");
    setReply(""); setConsentList([]); setSelectedConsent(null); setPassport(null); setLastMessage(""); setError("");
  }

  function send() {
    if (screen === "menu") openMenuOption(reply.trim());
    else if (screen === "consent-list") openConsentDetail(reply.trim());
    else if (screen === "consent-detail") respondConsent(reply.trim());
    else if (screen === "id" || screen === "emergency") { setScreen("menu"); setReply(""); }
  }

  const lines: string[] = (() => {
    if (screen === "mobile") return ["Simulated USSD session.", "", "Enter your mobile number below and press Send.", "", "Demo: 082 555 0198"];
    if (screen === "pin") return [`Mobile: ${mobile}`, "", "Enter your PIN.", "", "Demo PIN: 2580"];
    if (screen === "menu") return [`Welcome, ${session?.patient?.fullName || ""}`, "", "1. My CLANCLAST ID", "2. Pending consent requests", "3. Emergency info", "0. Exit"];
    if (screen === "id") return ["MY HUMANET ID", "", session?.patient?.fullName || "", session?.patient?.ccId || "", "", "0. Back"];
    if (screen === "consent-list") {
      if (consentList.length === 0) return ["No pending requests.", "", "0. Back"];
      return ["PENDING REQUESTS", "", ...consentList.map((c, i) => `${i + 1}. ${c.organization}`), "", "0. Back"];
    }
    if (screen === "consent-detail" && selectedConsent) return [selectedConsent.organization, (selectedConsent.scope as string[]).join(", "), "", "1. Approve (7 days)", "2. Decline", "0. Back"];
    if (screen === "emergency") return [
      "EMERGENCY INFO", "",
      `Blood type: ${passport?.emergencyInformation?.bloodType || "Not on file"}`,
      `Allergies: ${passport?.emergencyInformation?.allergies || "Not on file"}`,
      `Contact: ${passport?.emergencyInformation?.emergencyContactName || "Not on file"}`,
      "", "0. Back",
    ];
    return [];
  })();

  return (
    <div className="min-h-screen bg-[#041c19] p-4 md:grid md:place-items-center">
      <div className="mx-auto w-full max-w-sm rounded-[28px] border-4 border-[#10322e] bg-black p-5 font-mono text-[#8dd4ca] shadow-2xl">
        <div className="mb-4 flex items-center justify-between text-[10px] text-[#5cbbae]">
          <span>USSD SESSION</span>
          <button onClick={() => setContext("landing")} className="text-[#5cbbae] underline">exit</button>
        </div>
        <div className="min-h-[220px] whitespace-pre-line text-sm leading-6">
          {lines.map((l, i) => <p key={i}>{l || "\u00A0"}</p>)}
          {lastMessage && <p className="mt-2 text-[#eafbf8]">{lastMessage}</p>}
          {error && <p className="mt-2 text-[#ff9d8a]">{error}</p>}
          {busy && <p className="mt-2 text-[#5cbbae]">Loading…</p>}
        </div>
        {screen === "mobile" && (
          <div className="mt-4 flex gap-2">
            <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+27…" className="flex-1 rounded-lg border border-[#173d38] bg-[#041c19] px-3 py-2 text-sm text-[#eafbf8] outline-none" />
            <button onClick={() => mobile && setScreen("pin")} className="rounded-lg bg-[#10322e] px-4 py-2 text-xs font-bold text-[#8dd4ca]">Send</button>
          </div>
        )}
        {screen === "pin" && (
          <div className="mt-4 flex gap-2">
            <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" placeholder="PIN" className="flex-1 rounded-lg border border-[#173d38] bg-[#041c19] px-3 py-2 text-sm text-[#eafbf8] outline-none" />
            <button disabled={busy} onClick={submitPin} className="rounded-lg bg-[#10322e] px-4 py-2 text-xs font-bold text-[#8dd4ca] disabled:opacity-60">Send</button>
          </div>
        )}
        {(screen === "menu" || screen === "id" || screen === "consent-list" || screen === "consent-detail" || screen === "emergency") && (
          <div className="mt-4 flex gap-2">
            <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply" className="flex-1 rounded-lg border border-[#173d38] bg-[#041c19] px-3 py-2 text-sm text-[#eafbf8] outline-none" />
            <button disabled={busy} onClick={send} className="rounded-lg bg-[#10322e] px-4 py-2 text-xs font-bold text-[#8dd4ca] disabled:opacity-60">Send</button>
          </div>
        )}
        {session && <button onClick={endSession} className="mt-4 w-full text-center text-[10px] text-[#5cbbae] underline">End session</button>}
      </div>
    </div>
  );
}

function CaregiverPortal({ setContext }: { setContext: (c: Context) => void }) {
  const [view, setView] = useState(getToken("caregiver") ? "dashboard" : "login");
  const [form, setForm] = useState({ phone: "", pin: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [patient, setPatient] = useState<any>(null);
  const [consent, setConsent] = useState<any[]>([]);

  async function load() {
    setBusy(true); setError("");
    try {
      const [p, c] = await Promise.all([caregiverApi.patient(), caregiverApi.consent()]);
      setPatient(p); setConsent(c);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load caregiver data.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (getToken("caregiver") && view === "dashboard") load();
  }, [view]);

  async function login() {
    setBusy(true); setError("");
    try {
      const res = await authApi.caregiverLogin(form.phone, form.pin);
      saveToken("caregiver", res.token);
      setView("dashboard");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Incorrect phone number or PIN.");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    clearToken("caregiver");
    setView("login"); setPatient(null); setConsent([]); setForm({ phone: "", pin: "" });
  }

  async function respond(id: string, action: "approve" | "decline") {
    setBusy(true); setError("");
    try {
      if (action === "approve") await caregiverApi.approveConsent(id, "SEVEN_DAYS");
      else await caregiverApi.declineConsent(id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "That action failed.");
    } finally {
      setBusy(false);
    }
  }

  if (view === "login") {
    return (
      <div className="min-h-screen cc-canvas p-4 md:grid md:place-items-center">
        <div className="w-full max-w-sm rounded-[28px] bg-card p-7 shadow-xl">
          <button onClick={() => setContext("landing")}><Brand /></button>
          <h1 className="mt-6 font-display text-2xl font-extrabold">Caregiver sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in with the phone number and PIN a patient set up for you in their Profile.</p>
          <div className="mt-6 space-y-4">
            <Input label="Phone number" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
            <Input label="PIN" value={form.pin} onChange={(v) => setForm((f) => ({ ...f, pin: v.replace(/\D/g, "").slice(0, 6) }))} type="password" />
          </div>
          <ErrorNote message={error} />
          <button disabled={busy || !form.phone || !form.pin} onClick={login} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground disabled:opacity-60">{busy && <Spinner />}Sign in</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cc-canvas p-4 md:grid md:place-items-center">
      <div className="w-full max-w-sm rounded-[28px] bg-card p-7 shadow-xl">
        <div className="flex items-center justify-between">
          <button onClick={() => setContext("landing")}><Brand /></button>
          <button onClick={signOut} className="text-xs font-bold text-critical">Sign out</button>
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-primary">Caring for</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold">{patient?.fullName || "…"}</h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{patient?.ccId}</p>

        <div className="mt-6 rounded-2xl bg-muted p-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Emergency info</p>
          <p className="mt-2 text-sm"><b>Blood type:</b> {patient?.bloodType || "Not on file"}</p>
          <p className="mt-1 text-sm"><b>Allergies:</b> {patient?.allergies || "Not on file"}</p>
          <p className="mt-1 text-sm"><b>Emergency contact:</b> {patient?.emergencyContactName ? `${patient.emergencyContactName} (${patient.emergencyContactRelationship})` : "Not on file"}</p>
        </div>

        <p className="mt-6 text-sm font-bold">Consent requests</p>
        <div className="mt-3 space-y-3">
          {consent.length === 0 && <p className="text-xs text-muted-foreground">No requests.</p>}
          {consent.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border p-4">
              <p className="text-sm font-bold">{c.organization}</p>
              <p className="mt-1 text-xs text-muted-foreground">{(c.scope as string[]).join(" · ")}</p>
              {c.status === "PENDING" ? (
                <div className="mt-3 flex gap-2">
                  <button disabled={busy} onClick={() => respond(c.id, "approve")} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60">Approve (7 days)</button>
                  <button disabled={busy} onClick={() => respond(c.id, "decline")} className="rounded-lg border border-border px-3 py-2 text-xs font-bold disabled:opacity-60">Decline</button>
                </div>
              ) : <div className="mt-2"><PillStatus tone={c.status === "APPROVED" ? "green" : c.status === "DECLINED" ? "red" : "amber"}>{c.status}</PillStatus></div>}
            </div>
          ))}
        </div>
        <ErrorNote message={error} />
      </div>
    </div>
  );
}
