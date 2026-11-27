import { useEffect, useState } from "react";
import { ArrowRight, FileCheck2, ScanLine, UserPlus } from "lucide-react";
import { providerApi, type Dashboard } from "../../lib/api";
import { BrandWeave } from "../brand/BrandWeave";
import { navigate, type View } from "../lib/router";
import { ago } from "../lib/format";

// Stale-while-revalidate: returning to Today paints the last dashboard instantly, then refreshes.
let cache: Dashboard | null = null;

const STAT_LINKS: Record<string, View> = {
  checkedIn: "activity",
  inCare: "patients",
  identityPending: "patients",
  consentPending: "consent",
};

/** "Dr. Priya Naidoo" → "Dr Naidoo"; "Thabo Mokoena" → "Thabo". */
function salutation(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  const title = /^(dr|prof|sr|sister)\.?$/i.test(parts[0]) ? parts[0].replace(/\.$/, "") : "";
  return title && parts.length > 1 ? `${title} ${parts[parts.length - 1]}` : parts[0];
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function TodayView({ name }: { name?: string }) {
  const [d, setD] = useState<Dashboard | null>(cache);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    providerApi.dashboard().then((x) => { cache = x; if (live) { setD(x); setFailed(false); } }).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, []);

  const first = salutation(name ?? d?.provider.fullName ?? "");

  return (
    <>
      <div className="mb-5">
        <p className="tnum text-subhead text-ink-2">{new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="large-title mt-0.5">{greeting()}{first ? `, ${first}` : ""}</h1>
      </div>

      <div className="grid gap-3 @6xl/app:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Front-desk hero: the one action that matters most when a patient walks in */}
        <section className="hero flex min-h-[200px] flex-col p-6">
          <BrandWeave preset="card" scrim="even" />
          <div className="relative z-10 flex h-full flex-col">
            <p className="text-caption font-semibold uppercase tracking-[0.14em] text-[var(--brand-300)]">{d?.organization.name ?? " "}</p>
            <h2 className="mt-2 max-w-[24ch] text-title-2 font-semibold text-white">Someone at the desk?</h2>
            <p className="mt-1 max-w-[46ch] text-subhead text-white/70">Scan their code or search by name, date of birth or ID. Possible duplicates are flagged before you create anything new.</p>
            <div className="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-5 @md/app:flex">
              <button onClick={() => navigate("checkin")} className="btn btn-lg bg-white text-[#072b27] hover:bg-white/90"><ScanLine size={18} /> <span>Check in<span className="hidden @md/app:inline"> a patient</span></span></button>
              <button onClick={() => navigate("register")} className="btn btn-lg btn-glass-dark"><UserPlus size={18} /> Register</button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          {(d?.cards ?? Array.from({ length: 4 }, () => null)).map((c, i) => (
            <Stat key={c?.key ?? i} label={c?.label} value={c?.value} to={c ? STAT_LINKS[c.key] : undefined} />
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 @6xl/app:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="glass p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-headline font-semibold">Recent activity</h2>
            <button onClick={() => navigate("activity")} className="text-footnote font-semibold text-accent">See all</button>
          </div>
          {failed && !d ? (
            <p className="py-6 text-center text-footnote text-ink-2">Couldn’t load activity. Check your connection.</p>
          ) : !d ? (
            <ul className="space-y-3">{[0, 1, 2, 3].map((i) => <li key={i} className="flex items-center gap-3"><span className="skeleton h-8 w-8 !rounded-full" /><span className="flex-1"><span className="skeleton block h-3.5 w-52" /><span className="skeleton mt-1.5 block h-3 w-32" /></span></li>)}</ul>
          ) : d.recentActivity.length === 0 ? (
            <p className="py-6 text-center text-footnote text-ink-2">Nothing yet today.</p>
          ) : (
            <ul className="-mx-2">
              {d.recentActivity.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-start gap-3 rounded-[12px] px-2 py-2.5">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-subhead"><b className="font-semibold">{a.action}</b> · {a.subjectLabel}</span>
                    <span className="tnum block truncate text-caption text-ink-2">{a.actorLabel} · {a.status} · {ago(a.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass flex flex-col p-5">
          <h2 className="text-headline font-semibold">Read a patient’s summary</h2>
          <p className="mt-1 text-footnote text-ink-2">Scan the code on their phone or card. The signature is checked on this device, so it works when the issuing system is offline.</p>
          <button onClick={() => navigate("summary-verify")} className="btn btn-quiet btn-block mt-auto"><FileCheck2 size={17} /> Verify a summary</button>
        </section>
      </div>
    </>
  );
}

function Stat({ label, value, to }: { label?: string; value?: number; to?: View }) {
  const body = (
    <>
      <span className="tnum block text-[1.75rem] font-semibold leading-none tracking-[-0.02em]">{value ?? <span className="skeleton inline-block h-7 w-10" />}</span>
      <span className="mt-2 block text-footnote text-ink-2">{label ?? <span className="skeleton inline-block h-3 w-24" />}</span>
      {to && <ArrowRight size={15} className="absolute right-4 top-4 text-ink-3" />}
    </>
  );
  return to
    ? <button onClick={() => navigate(to)} className="glass press relative p-4 text-left">{body}</button>
    : <div className="glass relative p-4">{body}</div>;
}

