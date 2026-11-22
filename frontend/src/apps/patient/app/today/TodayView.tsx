import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, BadgeCheck, Building2, Handshake, History, LockKeyhole, Phone, QrCode, ShieldAlert, Users } from "lucide-react";
import { patientApi, trustApi, type SummaryIssuance } from "../../lib/api";
import { BrandWeave } from "../brand/BrandWeave";
import { navigate, type View } from "../lib/router";
import { ago, fmtDate, until } from "../lib/format";
import { useVault } from "../vault/vault";

/**
 * Today — what is true right now, nothing it can't back up (Canon Rule 5).
 * No completeness scores, no "verified" labels without a source.
 */

type AccessEntry = { id: string; organization: string; provider: string; action: string; isEmergency: boolean; reason: string | null; createdAt: string };
type Consent = { id: string; status: string; expiresAt?: string | null };

type Props = {
  name?: string;
  clanclastId?: string;
  identityVerified?: boolean;
  loading: boolean;
  consent: Consent[];
  teamCount: number;
  openNoSmartphone: () => void;
};

// Stale-while-revalidate cache: revisiting Today renders instantly from the last result.
let cache: { issued: SummaryIssuance[]; access: AccessEntry[] } | null = null;

export default function TodayView({ name, clanclastId, identityVerified, loading, consent, teamCount, openNoSmartphone }: Props) {
  const [data, setData] = useState(cache);
  const vault = useVault();

  useEffect(() => {
    let live = true;
    Promise.all([trustApi.issued().catch(() => []), patientApi.accessLog().catch(() => [])]).then(([issued, access]) => {
      cache = { issued, access: access as AccessEntry[] };
      if (live) setData(cache);
    });
    return () => { live = false; };
  }, []);

  const now = Date.now();
  const pending = consent.filter((c) => c.status === "PENDING").length;
  const active = consent.filter((c) => c.status === "APPROVED" && (!c.expiresAt || new Date(c.expiresAt).getTime() > now)).length;
  const valid = (data?.issued ?? []).filter((s) => !s.revokedAt && new Date(s.expiresAt).getTime() > now);
  const nextExpiry = valid.map((s) => s.expiresAt).sort()[0];
  const emergency = valid.filter((s) => s.tier === 1).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))[0];
  const lastAccess = data?.access[0];

  const firstName = (name || "").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-3">
      {/* Greeting */}
      <div className="mb-4 flex items-center gap-3.5">
        <button onClick={() => navigate("profile")} aria-label="Open account" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-callout font-semibold text-[var(--canvas-base)] transition-transform duration-150 ease-spring active:scale-90">
          {(name || "·").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
        </button>
        <div className="min-w-0">
          <p className="text-footnote text-ink-2">{today}</p>
          <h1 className="text-balance text-title-1 font-bold tracking-[-0.025em]">{loading && !name ? <span className="skeleton inline-block h-7 w-56 align-middle" /> : `${greeting}${firstName ? `, ${firstName}` : ""}`}</h1>
        </div>
      </div>

      {/* Identity hero */}
      <section className="hero p-5">
        <BrandWeave preset="card" scrim="even" />
        <div className="relative z-10">
          <p className="text-caption font-semibold uppercase tracking-[0.14em] text-[var(--brand-300)]">CLANCLAST ID</p>
          <p className="mono mt-2 text-[1.625rem] font-medium leading-8 tracking-[0.02em] text-white">{clanclastId || <span className="skeleton inline-block h-7 w-44 align-middle opacity-30" />}</p>
          <p className="mt-0.5 text-subhead text-white/75">{name || " "}</p>
          <div className="mt-3">
            {identityVerified === undefined ? <span className="inline-block h-6" /> : identityVerified ? (
              <span className="badge h-6 bg-white/15 text-white"><BadgeCheck size={13} strokeWidth={2.4} /> Identity verified</span>
            ) : (
              <span className="badge h-6 bg-[rgb(242_196_107/0.18)] text-[#f7d58e]"><AlertTriangle size={13} strokeWidth={2.4} /> Identity not yet verified</span>
            )}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={() => navigate("qr")} className="btn btn-inverse"><QrCode size={17} /> Show my code</button>
            <button onClick={() => navigate("vault")} className="btn btn-glass-dark"><LockKeyhole size={16} /> {vault.status === "unlocked" ? "Vault open" : "Open vault"}</button>
          </div>
        </div>
      </section>

      {/* Needs attention */}
      {pending > 0 && (
        <button onClick={() => navigate("consent")} className="glass press enter flex w-full items-center gap-3.5 p-4 text-left">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-warning-tint text-warning"><Handshake size={21} /></span>
          <span className="min-w-0 flex-1">
            <span className="tnum block text-callout font-semibold">{pending} access request{pending === 1 ? "" : "s"} waiting</span>
            <span className="block text-footnote text-ink-2">Nothing is shared until you decide</span>
          </span>
          <span className="chev"><ArrowRight size={15} strokeWidth={2.2} /></span>
        </button>
      )}

      {/* Status */}
      <div className="grid grid-cols-2 gap-3 @3xl/app:grid-cols-4">
        <Stat to="consent" Icon={Handshake} value={loading && !consent.length ? null : active} foot={active ? "Review or revoke" : "No one right now"} label="with access now" />
        <Stat to="vault" Icon={LockKeyhole} value={data ? valid.length : null} label={valid.length === 1 ? "signed summary" : "signed summaries"}
          foot={nextExpiry ? `Next expires ${until(nextExpiry)}` : data ? "None issued yet" : undefined} />
        <Stat to="team" Icon={Users} value={loading && !teamCount ? null : teamCount} label={teamCount === 1 ? "care provider" : "care providers"}
          foot={teamCount ? "Via your consent" : undefined} />
        <Stat to="profile-access-log" Icon={History} value={data ? data.access.length : null} label="accesses logged"
          foot={lastAccess ? `Latest ${ago(lastAccess.createdAt)}` : data ? "None yet" : undefined} />
      </div>

      {/* Emergency summary — the one tinted card on this screen */}
      {data && (emergency ? (
        <button onClick={() => navigate("qr", { search: "tier=1" })} className="glass-tint press flex w-full items-center gap-3.5 p-4 text-left">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-white/80 text-accent"><BadgeCheck size={21} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-callout font-semibold">Emergency summary ready to show</span>
            <span className="tnum block text-footnote text-ink-2">Signed v{emergency.version} · expires {fmtDate(emergency.expiresAt)}{emergency.synthetic ? " · synthetic" : ""}</span>
          </span>
          <span className="chev"><ArrowRight size={15} strokeWidth={2.2} /></span>
        </button>
      ) : (
        <button onClick={() => navigate("vault")} className="glass-tint press flex w-full items-center gap-3.5 p-4 text-left">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-white/80 text-accent"><ShieldAlert size={21} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-callout font-semibold">Add an emergency summary</span>
            <span className="block text-footnote text-ink-2">Allergies, medication and blood group a clinic can check, even offline</span>
          </span>
          <span className="chev"><ArrowRight size={15} strokeWidth={2.2} /></span>
        </button>
      ))}

      {/* Recent activity */}
      <section className="pt-3">
        <div className="mb-2.5 flex items-center justify-between px-1">
          <h2 className="text-footnote font-semibold uppercase tracking-[0.06em] text-ink-2">Recent activity</h2>
          <button onClick={() => navigate("profile-access-log")} className="btn btn-plain min-h-8 px-2 text-footnote">See all</button>
        </div>
        {!data ? (
          <div className="list-group">{[0, 1].map((i) => <div key={i} className="flex items-center gap-3 px-4 py-3"><span className="skeleton h-10 w-10 !rounded-[12px]" /><span className="flex-1"><span className="skeleton block h-4 w-40" /><span className="skeleton mt-1.5 block h-3 w-56" /></span></div>)}</div>
        ) : data.access.length === 0 ? (
          <div className="glass p-4 text-footnote text-ink-2">No one has accessed your information yet. Every access will be listed here.</div>
        ) : (
          <div className="list-group">
            {data.access.slice(0, 3).map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${a.isEmergency ? "bg-critical-tint text-critical" : "bg-surface-2 text-ink-2"}`}>
                  {a.isEmergency ? <ShieldAlert size={18} /> : <Building2 size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-callout font-medium">{a.organization}</p>
                  <p className="truncate text-footnote text-ink-2">{a.provider} · {a.action}{a.isEmergency ? " · emergency" : ""}</p>
                </div>
                <span className="tnum shrink-0 text-caption text-ink-2">{ago(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <button onClick={openNoSmartphone} className="glass press mt-3 flex w-full items-center gap-3.5 p-4 text-left">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-accent-tint text-accent"><Phone size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-callout font-semibold">No smartphone? Still connected.</span>
          <span className="block text-footnote text-ink-2">Card, USSD, SMS and caregiver access</span>
        </span>
        <span className="chev"><ArrowRight size={15} strokeWidth={2.2} /></span>
      </button>
    </div>
  );
}

function Stat({ to, Icon, value, label, foot }: { to: View; Icon: typeof Users; value: number | null; label: string; foot?: ReactNode }) {
  return (
    <button onClick={() => navigate(to)} className="glass press flex flex-col p-4 text-left">
      <span className="flex items-start justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-accent-tint text-accent"><Icon size={18} /></span>
        <span className="chev !h-7 !w-7"><ArrowRight size={14} strokeWidth={2.2} /></span>
      </span>
      <span className="pt-3">
        {value === null ? <span className="skeleton block h-8 w-10" /> : <span className="tnum block text-[2rem] font-bold leading-8 tracking-[-0.03em]">{value}</span>}
        <span className="mt-1 block truncate text-footnote text-ink-2">{label}</span>
        {/* Always reserve the footnote line so labels align across tiles */}
        <span className="tnum mt-0.5 block truncate text-caption text-ink-3">{foot ?? "\u00a0"}</span>
      </span>
    </button>
  );
}
