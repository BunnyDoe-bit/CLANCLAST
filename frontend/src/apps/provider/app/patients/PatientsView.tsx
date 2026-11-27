import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, ScanLine, Search, Users } from "lucide-react";
import { providerApi } from "../../lib/api";
import { navigate } from "../lib/router";

/** Patients in your institution's care: identity status at a glance, everything else one tap away. */
type Row = { id: string; humanetId: string; fullName: string; identityVerified: boolean };
let cache: Row[] | null = null;

export default function PatientsView() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(cache);
  const [filter, setFilter] = useState<"all" | "pending">("all");

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => providerApi.patients(q.trim() || undefined).then((r) => { if (!q.trim()) cache = r; if (live) setRows(r); }).catch(() => live && setRows([])), q ? 160 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  const shown = useMemo(() => (rows ?? []).filter((r) => filter === "all" || !r.identityVerified), [rows, filter]);
  const pending = rows?.filter((r) => !r.identityVerified).length ?? 0;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="large-title">Patients</h1>
          <p className="mt-1 text-subhead text-ink-2">People in your institution’s care. Identity and consent only; their records stay in your own system.</p>
        </div>
        <button onClick={() => navigate("checkin")} className="btn btn-primary"><ScanLine size={16} /> Check in</button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
          <input className="input pl-11" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, CLANCLAST ID or mobile" aria-label="Search patients" />
        </label>
        <div className="flex rounded-[12px] bg-surface-2 p-0.5 text-footnote font-semibold" role="radiogroup" aria-label="Filter">
          {([["all", "All"], ["pending", `Identity pending${pending ? ` · ${pending}` : ""}`]] as const).map(([v, l]) => (
            <button key={v} role="radio" aria-checked={filter === v} onClick={() => setFilter(v)} className={`h-9 rounded-[10px] px-3 ${filter === v ? "bg-surface text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-ink-2"}`}>{l}</button>
          ))}
        </div>
      </div>

      <section className="glass min-w-0 p-2">
        {!rows ? <ul className="space-y-2 p-2">{[0, 1, 2, 3, 4].map((i) => <li key={i} className="skeleton h-12 !rounded-[12px]" />)}</ul>
          : shown.length === 0 ? (
            <div className="py-10 text-center"><Users size={22} className="mx-auto text-ink-3" /><p className="mt-2 text-footnote text-ink-2">{q ? `Nobody in your care matches “${q}”.` : "No patients here yet."}</p></div>
          ) : (
            <ul>
              {shown.map((p) => (
                <li key={p.id}>
                  <button onClick={() => navigate("patient", { search: `id=${p.id}` })} className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left hover:bg-[var(--glass)]">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-tint text-footnote font-semibold text-accent">{p.fullName.replace(/^T\.\s*/, "T ").split(/\s+/).slice(0, 2).map((w) => w[0]).join("")}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-subhead font-semibold">{p.fullName}</span>
                      <span className="mono block text-caption text-ink-2">{p.humanetId}</span>
                    </span>
                    {p.identityVerified ? <span className="hidden items-center gap-1 text-caption font-semibold text-positive @md/app:inline-flex"><BadgeCheck size={14} /> Verified</span> : <span className="badge bg-warning-tint text-warning">Identity pending</span>}
                    <ArrowRight size={16} className="shrink-0 text-ink-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
      </section>
    </>
  );
}
