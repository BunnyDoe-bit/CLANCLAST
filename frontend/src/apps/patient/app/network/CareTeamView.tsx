import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, Check, ChevronLeft, Plus, Search } from "lucide-react";
import { ApiError, patientApi } from "../../lib/api";
import { navigate, type View } from "../lib/router";
import { fmtDate } from "../lib/format";

/**
 * Care team + Connect a provider. Connecting adds an organisation to the patient's network;
 * it never shares information by itself (Canon Rule 1) — that always needs a consent decision.
 */
export type TeamMember = { id: string; label: string; role: string; status: string; connectedAt: string };
type Org = { id: string; name: string; type: string; status: "CONNECTED" | "PENDING" | "NEEDS_ATTENTION" | string };

const ORG_STATUS: Record<string, { label: string; tone: string }> = {
  CONNECTED: { label: "Live on CLANCLAST", tone: "bg-positive-tint text-positive" },
  PENDING: { label: "Joining soon", tone: "bg-warning-tint text-warning" },
  NEEDS_ATTENTION: { label: "Under review", tone: "bg-surface-2 text-ink-2" },
};
const TYPE: Record<string, string> = { HOSPITAL: "Hospital", CLINIC: "Clinic", LABORATORY: "Laboratory", PHARMACY: "Pharmacy" };
const isOrg = (s: string) => /clinic|hospital|lab|pharmac|cent(re|er)|medical|health|practice/i.test(s);

export default function CareTeamView({ view, team, refreshTeam }: { view: View; team: TeamMember[]; refreshTeam: () => Promise<void> }) {
  return view === "connect-provider" ? <Connect team={team} refreshTeam={refreshTeam} /> : <Team team={team} />;
}

function Avatar({ label }: { label: string }) {
  return isOrg(label) ? (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-accent-tint text-accent"><Building2 size={20} /></span>
  ) : (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-tint text-footnote font-semibold text-accent">
      {label.replace(/^Dr\.?\s+/i, "").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
    </span>
  );
}

function Team({ team }: { team: TeamMember[] }) {
  return (
    <>
      <div className="mb-5">
        <h1 className="large-title">Care team</h1>
        <p className="mt-1 text-subhead text-ink-2">Providers and organisations you've connected with.</p>
      </div>
      {team.length === 0 ? (
        <div className="glass p-5 text-footnote text-ink-2">No one yet. Connect a clinic or hospital to receive access requests from them.</div>
      ) : (
        <ul className="list-group">
          {team.map((m) => (
            <li key={m.id} className="list-row">
              <Avatar label={m.label} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-callout font-semibold">{m.label}</span>
                <span className="block truncate text-footnote text-ink-2">{m.role}</span>
                <span className="tnum block text-caption text-ink-3">Connected {fmtDate(m.connectedAt)}</span>
              </span>
              <span className="badge bg-positive-tint text-positive">{m.status}</span>
            </li>
          ))}
        </ul>
      )}
      <button onClick={() => navigate("connect-provider")} className="btn btn-primary btn-lg btn-block mt-4"><Plus size={18} strokeWidth={2.4} /> Connect a provider</button>
      <button onClick={() => navigate("consent")} className="glass press mt-3 flex w-full items-center gap-3 p-4 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-callout font-semibold">Who can see what</span>
          <span className="block text-footnote text-ink-2">Being on your team doesn't give access. Consent does.</span>
        </span>
        <span className="chev"><ArrowRight size={15} strokeWidth={2.2} /></span>
      </button>
    </>
  );
}

function Connect({ team, refreshTeam }: { team: TeamMember[]; refreshTeam: () => Promise<void> }) {
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [q, setQ] = useState("");
  const [state, setState] = useState<Record<string, "sending" | "done">>({});
  const [error, setError] = useState("");
  useEffect(() => { patientApi.organizations().then(setOrgs).catch(() => { setOrgs([]); setError("Couldn't load organisations. Check your connection."); }); }, []);

  const onTeam = useMemo(() => new Set(team.map((t) => t.label.toLowerCase())), [team]);
  const shown = (orgs ?? []).filter((o) => o.name.toLowerCase().includes(q.trim().toLowerCase()));

  async function connect(o: Org) {
    setError("");
    setState((s) => ({ ...s, [o.id]: "sending" }));
    try {
      await patientApi.connectOrganization(o.id);
      setState((s) => ({ ...s, [o.id]: "done" }));
      refreshTeam();
    } catch (e) {
      setState((s) => { const n = { ...s }; delete n[o.id]; return n; });
      setError(e instanceof ApiError ? e.message : "Couldn't connect. Try again.");
    }
  }

  return (
    <>
      <div className="mb-5">
        <button onClick={() => navigate("team")} className="btn btn-plain -ml-2 mb-1 min-h-9 px-2 text-callout"><ChevronLeft size={20} /> Care team</button>
        <h1 className="large-title">Connect a provider</h1>
        <p className="mt-1 text-subhead text-ink-2">Connecting lets them send you access requests. Nothing is shared until you approve one.</p>
      </div>
      <label className="relative block">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
        <input className="input pl-11" placeholder="Search clinics and hospitals" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search organisations" />
      </label>
      {error && <p role="alert" className="mt-3 rounded-[14px] bg-critical-tint px-3.5 py-2.5 text-footnote text-critical">{error}</p>}
      {orgs === null ? (
        <div className="list-group mt-4">{[0, 1, 2].map((i) => <div key={i} className="list-row"><span className="skeleton h-11 w-11 !rounded-[14px]" /><span className="flex-1"><span className="skeleton block h-4 w-44" /><span className="skeleton mt-1.5 block h-3 w-28" /></span></div>)}</div>
      ) : shown.length === 0 ? (
        <div className="glass mt-4 p-5 text-center text-footnote text-ink-2">No organisations match “{q}”.</div>
      ) : (
        <ul className="list-group mt-4">
          {shown.map((o) => {
            const st = ORG_STATUS[o.status] ?? ORG_STATUS.NEEDS_ATTENTION;
            const connected = state[o.id] === "done" || onTeam.has(o.name.toLowerCase());
            return (
              <li key={o.id} className="list-row">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-accent-tint text-accent"><Building2 size={20} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-callout font-semibold leading-snug">{o.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-caption text-ink-2">{TYPE[o.type] ?? o.type}</span>
                    <span className={`badge h-5 ${st.tone}`}>{st.label}</span>
                  </span>
                </span>
                {connected ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-footnote font-semibold text-positive"><Check size={16} strokeWidth={2.6} /> Connected</span>
                ) : (
                  <button onClick={() => connect(o)} disabled={state[o.id] === "sending"} className="btn btn-secondary min-h-9 shrink-0 px-3.5 text-footnote">
                    {state[o.id] === "sending" ? "Connecting…" : "Connect"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
