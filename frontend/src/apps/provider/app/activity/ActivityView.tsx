import { useEffect, useMemo, useState } from "react";
import { Activity as ActivityIcon, ArrowLeftRight, FileSignature, Fingerprint, Handshake, ScanLine, type LucideIcon } from "lucide-react";
import { providerApi, type Activity } from "../../lib/api";

/** Everything your team did, newest first, in plain words. */
type Kind = "all" | "desk" | "identity" | "consent" | "summaries" | "network";
const KINDS: { v: Kind; label: string; Icon: LucideIcon; test: RegExp }[] = [
  { v: "desk", label: "Front desk", Icon: ScanLine, test: /check|regist|lookup|identity confirmed|identity verified|viewed/i },
  { v: "identity", label: "Identity", Icon: Fingerprint, test: /match|link|duplicate|scan/i },
  { v: "consent", label: "Consent & referrals", Icon: Handshake, test: /consent|referral|emergency|access requested|reminder/i },
  { v: "summaries", label: "Summaries", Icon: FileSignature, test: /summary|key/i },
  { v: "network", label: "Network", Icon: ArrowLeftRight, test: /endpoint|connect|fhir|sync/i },
];
const kindOf = (a: Activity) => KINDS.find((k) => k.test.test(a.action)) ?? null;
let cache: Activity[] | null = null;

export default function ActivityView() {
  const [rows, setRows] = useState<Activity[] | null>(cache);
  const [kind, setKind] = useState<Kind>("all");
  useEffect(() => { providerApi.activity().then((r) => { cache = r; setRows(r); }).catch(() => setRows([])); }, []);

  const days = useMemo(() => {
    const list = (rows ?? []).filter((a) => kind === "all" || kindOf(a)?.v === kind);
    const map = new Map<string, Activity[]>();
    const today = new Date().toDateString(), yesterday = new Date(Date.now() - 86_400_000).toDateString();
    for (const a of list) {
      const d = new Date(a.createdAt).toDateString();
      const label = d === today ? "Today" : d === yesterday ? "Yesterday" : new Date(a.createdAt).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });
      (map.get(label) ?? map.set(label, []).get(label)!).push(a);
    }
    return [...map.entries()];
  }, [rows, kind]);

  return (
    <>
      <div className="mb-5">
        <h1 className="large-title">Activity</h1>
        <p className="mt-1 text-subhead text-ink-2">Everything your team did, newest first. Patients see their own entries in their access log.</p>
      </div>
      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1" role="radiogroup" aria-label="Filter">
        {[{ v: "all" as Kind, label: "All" }, ...KINDS].map((k) => (
          <button key={k.v} role="radio" aria-checked={kind === k.v} onClick={() => setKind(k.v)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-footnote font-semibold ${kind === k.v ? "bg-ink text-[var(--canvas-base)]" : "glass-float text-ink-2"}`}>{k.label}</button>
        ))}
      </div>
      {!rows ? <div className="skeleton h-60 !rounded-[var(--radius-card)]" /> : days.length === 0 ? (
        <div className="glass p-8 text-center"><ActivityIcon size={22} className="mx-auto text-ink-3" /><p className="mt-2 text-footnote text-ink-2">Nothing here yet.</p></div>
      ) : days.map(([day, list]) => (
        <section key={day} className="mb-5">
          <h2 className="eyebrow mb-2 px-1">{day}</h2>
          <ul className="glass px-2 py-1">
            {list.map((a) => {
              const k = kindOf(a);
              const I = k?.Icon ?? ActivityIcon;
              return (
                <li key={a.id} className="flex items-start gap-3 rounded-[14px] px-2 py-2.5">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-accent-tint text-accent"><I size={15} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-subhead"><b className="font-semibold">{a.action}</b> · {a.subjectLabel}</span>
                    <span className="block truncate text-caption text-ink-2">{a.actorLabel}{a.status ? ` · ${a.status}` : ""}</span>
                  </span>
                  <span className="tnum shrink-0 pt-0.5 text-caption text-ink-3">{new Date(a.createdAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
