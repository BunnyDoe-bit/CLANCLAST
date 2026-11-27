import { useEffect, useState } from "react";
import { BadgeCheck, Search } from "lucide-react";
import { providerApi } from "../../lib/api";

export type PickedPatient = { id: string; humanetId: string; fullName: string; identityVerified: boolean };

/** Search the patients in your care. Debounced; results never arrive out of order. */
export function PatientPicker({ onPick, requireVerified = false, autoFocus = true }: { onPick: (p: PickedPatient) => void; requireVerified?: boolean; autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<PickedPatient[] | null>(null);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => providerApi.patients(q.trim() || undefined).then((r) => live && setList(r)).catch(() => live && setList([])), 160);
    return () => { live = false; clearTimeout(t); };
  }, [q]);
  return (
    <div>
      <label className="relative block">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
        <input autoFocus={autoFocus} className="input pl-11" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or CLANCLAST ID" aria-label="Search patients in your care" />
      </label>
      <ul className="-mx-2 mt-2 max-h-[46vh] overflow-y-auto">
        {!list ? [0, 1, 2].map((i) => <li key={i} className="skeleton mx-2 mb-2 h-12 !rounded-[12px]" />) : list.length === 0 ? <li className="px-2 py-4 text-footnote text-ink-2">No patients in your care match. Check them in first.</li>
          : list.map((p) => {
            const blocked = requireVerified && !p.identityVerified;
            return (
              <li key={p.id}>
                <button type="button" onClick={() => !blocked && onPick(p)} disabled={blocked} className="flex w-full items-center gap-3 rounded-[14px] px-2 py-2.5 text-left hover:bg-[var(--glass)] disabled:opacity-60">
                  <span className="min-w-0 flex-1"><span className="block truncate text-subhead font-semibold">{p.fullName}</span><span className="mono block text-caption text-ink-2">{p.humanetId}</span></span>
                  {p.identityVerified ? <BadgeCheck size={16} className="shrink-0 text-accent" aria-label="Identity verified" /> : <span className="badge shrink-0 bg-warning-tint text-warning">{blocked ? "Verify identity first" : "Not verified"}</span>}
                </button>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
