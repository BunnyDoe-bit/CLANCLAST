import type { SummaryContent } from "../../lib/api";

/** A summary's clinical content, laid out the same way everywhere it's shown. */
const SECTIONS: { key: keyof SummaryContent; label: string; tier: 1 | 2 }[] = [
  { key: "allergies", label: "Allergies", tier: 1 },
  { key: "chronicConditions", label: "Chronic conditions", tier: 1 },
  { key: "currentMedication", label: "Current medication", tier: 1 },
  { key: "alerts", label: "Alerts", tier: 1 },
  { key: "recentDiagnoses", label: "Recent diagnoses", tier: 2 },
  { key: "procedures", label: "Procedures", tier: 2 },
  { key: "activeReferrals", label: "Active referrals", tier: 2 },
];

export function SummaryContentView({ c, tier }: { c: SummaryContent; tier: 1 | 2 }) {
  return (
    <div className="grid gap-4 @xl/app:grid-cols-2">
      <div className="rounded-[16px] bg-critical-tint px-4 py-3 @xl/app:col-span-2">
        <p className="text-caption font-semibold uppercase tracking-[0.08em] text-critical">Blood group</p>
        <p className="tnum text-[1.75rem] font-bold leading-tight text-critical">{c.bloodGroup || "Not recorded"}</p>
      </div>
      {SECTIONS.filter((s) => s.tier <= tier).map((s) => {
        const v = (c[s.key] as string[] | undefined) ?? [];
        return (
          <div key={s.key}>
            <p className="eyebrow mb-1">{s.label}</p>
            {v.length ? <ul className="space-y-0.5">{v.map((x, i) => <li key={i} className="text-subhead">{x}</li>)}</ul> : <p className="text-subhead text-ink-3">None recorded</p>}
          </div>
        );
      })}
      {tier === 2 && (
        <div className="@xl/app:col-span-2">
          <p className="eyebrow mb-1">Key results</p>
          {c.keyResults?.length ? (
            <ul className="divide-y divide-[var(--hairline)]">
              {c.keyResults.map((r, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 py-1.5 text-subhead">
                  <span>{r.name}</span>
                  <span className="tnum font-semibold">{r.value} <span className="font-normal text-ink-2">{r.unit}</span>{r.date && <span className="ml-2 font-normal text-ink-3">{r.date}</span>}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-subhead text-ink-3">None recorded</p>}
        </div>
      )}
    </div>
  );
}
