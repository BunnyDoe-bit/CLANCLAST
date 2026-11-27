import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Match } from "../../lib/api";

export const isExact = (m: Match) => m.overallScore === 1 && /national ID/i.test(m.explanation[0] ?? "");
/** The engine's wording, minus jargon. */
export const evidence = (x: string) => x.replace(" (deterministic).", ".").replace("Exact match on national ID", "Same ID number").replace(/ - not counted either way\./, ", so it isn’t counted either way.");

export const TIER = {
  exact: { label: "Exact match on ID number", tone: "bg-positive-tint text-positive" },
  auto_link: { label: "Very likely the same person", tone: "bg-positive-tint text-positive" },
  escalate: { label: "Possible match — compare details", tone: "bg-warning-tint text-warning" },
  distinct: { label: "Different person", tone: "bg-surface-2 text-ink-2" },
} as const;

export function MatchRow({ m, onPick }: { m: Match; onPick: () => void }) {
  const [open, setOpen] = useState(m.tier === "escalate");
  const exact = isExact(m);
  const t = TIER[exact ? "exact" : m.tier];
  return (
    <li className="glass p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 basis-[220px]">
          <p className="truncate text-callout font-semibold">{m.fullName}</p>
          <p className="mono text-caption text-ink-2">{m.humanetId}{!m.identityVerified && <span className="font-sans text-warning"> · identity check pending</span>}</p>
          <span className={`badge mt-2 whitespace-nowrap ${t.tone}`}>{t.label} · <span className="tnum">{Math.round(m.overallScore * 100)}%</span></span>
        </div>
        <button onClick={onPick} className="btn btn-primary w-full shrink-0 @md/app:w-auto">This is them</button>
      </div>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-2.5 flex items-center gap-1 text-caption font-semibold text-ink-2">
        Evidence <ChevronDown size={14} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="mt-1.5 space-y-1">
          {m.explanation.map((x) => <li key={x} className="flex gap-2 text-footnote text-ink-2"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-3" />{evidence(x)}</li>)}
        </ul>
      )}
    </li>
  );
}
