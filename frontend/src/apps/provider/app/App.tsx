import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { authApi, clearToken, getToken, providerApi, setToken, type ProviderSession } from "../lib/api";
import { OverlayRoot } from "./ui/Overlay";
import { SupportHost } from "./support/Support";
import { AppShell } from "./shell/AppShell";
import { SignIn } from "./auth/SignIn";
import TodayView from "./today/TodayView";
import { AUTH_VIEWS, navigate, useView, type View } from "./lib/router";

const CheckInView = lazy(() => import("./checkin/CheckInView"));
const RegisterView = lazy(() => import("./checkin/RegisterView"));
const SummariesView = lazy(() => import("./summaries/SummariesView"));
const VerifyView = lazy(() => import("./summaries/VerifyView"));
const ConnectView = lazy(() => import("./connect/ConnectView"));
const PatientsView = lazy(() => import("./patients/PatientsView"));
const PatientView = lazy(() => import("./patients/PatientView"));
const ConsentView = lazy(() => import("./requests/ConsentView"));
const ReferralsView = lazy(() => import("./requests/ReferralsView"));
const ActivityView = lazy(() => import("./activity/ActivityView"));
const SettingsView = lazy(() => import("./settings/SettingsView"));

type Me = { fullName: string; role: string; organization: { name: string; status: string } };

export default function App() {
  return (
    <div className="@container/app relative h-full">
      <Workspace />
      <SupportHost />
      <OverlayRoot />
    </div>
  );
}

function Workspace() {
  const view = useView();
  const [signedIn, setSignedIn] = useState(() => !!getToken());
  const [me, setMe] = useState<Me | null>(null);
  const [badges, setBadges] = useState<Partial<Record<View, number>>>({});

  const signOut = useCallback(() => {
    clearToken();
    setSignedIn(false);
    setMe(null);
    navigate("login", { replace: true });
  }, []);

  // Route guard: auth screens only when signed out, the workspace only when signed in.
  useEffect(() => {
    if (!signedIn && !AUTH_VIEWS.has(view)) navigate("login", { replace: true });
    if (signedIn && AUTH_VIEWS.has(view)) navigate("home", { replace: true });
  }, [signedIn, view]);

  useEffect(() => {
    window.addEventListener("cc:session-expired", signOut);
    return () => window.removeEventListener("cc:session-expired", signOut);
  }, [signOut]);

  // Who's signed in, plus the counts that badge the navigation.
  useEffect(() => {
    if (!signedIn) return;
    authApi.me().then((m) => {
      const p = m.provider ?? m;
      setMe({ fullName: p.fullName, role: p.role, organization: p.organization });
    }).catch(() => {});
    providerApi.consentRequests().then((l) => setBadges((b) => ({ ...b, consent: l.filter((r) => r.status === "PENDING").length }))).catch(() => {});
  }, [signedIn]);

  const onSession = (s: ProviderSession) => {
    setToken(s.token);
    setMe({ fullName: s.provider.fullName, role: s.provider.role, organization: s.provider.organization });
    setSignedIn(true);
    navigate("home", { replace: true });
  };

  if (!signedIn || AUTH_VIEWS.has(view)) return <SignIn mode={view === "join" ? "join" : "login"} onSession={onSession} />;

  return (
    <AppShell
      view={view} go={(v, search) => navigate(v, { search })} badges={badges}
      name={me?.fullName} role={me?.role} org={me?.organization} onSignOut={signOut}
    >
      <Suspense fallback={<div className="skeleton h-40 w-full" />}>
        <Screen view={view} name={me?.fullName} onSignOut={signOut} onProfile={(p) => setMe((m) => m && { ...m, ...p })} />
      </Suspense>
    </AppShell>
  );
}

function Screen({ view, name, onSignOut, onProfile }: { view: View; name?: string; onSignOut: () => void; onProfile: (p: { fullName: string; role: string }) => void }) {
  switch (view) {
    case "home": return <TodayView name={name} />;
    case "checkin": return <CheckInView />;
    case "register": return <RegisterView />;
    case "summaries": return <SummariesView />;
    case "summary-verify": return <VerifyView />;
    case "connect": return <ConnectView />;
    case "patients": return <PatientsView />;
    case "patient": return <PatientView />;
    case "consent": return <ConsentView />;
    case "referrals": return <ReferralsView />;
    case "activity": return <ActivityView />;
    case "settings": return <SettingsView onSignOut={onSignOut} onProfile={onProfile} />;
    default: return <TodayView name={name} />;
  }
}
