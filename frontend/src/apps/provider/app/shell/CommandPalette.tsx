import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BadgeCheck, CornerDownLeft, Search, UserRound } from "lucide-react";
import { providerApi } from "../../lib/api";
import { Overlay } from "../ui/Overlay";
import type { View } from "../lib/router";
import { ALL_NAV } from "./AppShell";

type Patient = { id: string; humanetId: string; fullName: string; identityVerified?: boolean };
type Row = { kind: "screen"; view: View; label: string; hint?: string; Icon: (typeof ALL_NAV)[number]["Icon"] } | { kind: "patient"; p: Patient };

/**
 * ⌘K: one place to find a patient (by name or CLANCLAST ID) or jump to a screen.
 * Arrow keys move, Enter opens, Escape closes. Patient search is debounced and
 * cancelled when a newer query starts, so results never arrive out of order.
 */
export function CommandPalette({ close, go }: { close: () => void; go: (v: View, search?: string) => void }) {
  const [q, setQ] = useState("");
  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { input.current?.focus(); }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setPatients(null); return; }
    let live = true;
    const t = setTimeout(() => {
      providerApi.patients(term).then((r) => live && setPatients(r.slice(0, 6))).catch(() => live && setPatients([]));
    }, 160);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  const rows: Row[] = useMemo(() => {
    const term = q.trim().toLowerCase();
    const screens = ALL_NAV.filter((n) => !term || n.label.toLowerCase().includes(term) || n.hint?.toLowerCase().includes(term))
      .map((n) => ({ kind: "screen" as const, view: n.view, label: n.label, hint: n.hint, Icon: n.Icon }));
    return [...(patients ?? []).map((p) => ({ kind: "patient" as const, p })), ...screens];
  }, [q, patients]);

  useEffect(() => { setActive(0); }, [rows.length]);

  const open = (r: Row) => {
    close();
    if (r.kind === "patient") go("patient", `id=${r.p.id}`);
    else go(r.view);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, rows.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && rows[active]) { e.preventDefault(); open(rows[active]); }
  };

  const searching = q.trim().length >= 2 && patients === null;

  return (
    <Overlay>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-[calc(var(--safe-top)+12px)] @3xl/app:pt-[12vh]" onClick={close}>
        <div aria-hidden="true" className="scrim-enter absolute inset-0 bg-[rgb(4_20_18/0.28)] backdrop-blur-[6px]" />
        <div
          onClick={(e) => e.stopPropagation()} onKeyDown={onKey}
          role="dialog" aria-modal="true" aria-label="Search"
          className="dialog-enter glass-float relative w-full max-w-[600px] overflow-hidden rounded-[24px]"
        >
          <label className="flex h-14 items-center gap-3 border-b border-hairline px-4">
            <Search size={19} className="shrink-0 text-ink-2" />
            <input
              ref={input} value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Patient name, CLANCLAST ID or screen"
              aria-label="Search" role="combobox" aria-expanded="true" aria-controls="palette-list"
              aria-activedescendant={rows[active] ? `palette-${active}` : undefined}
              className="h-full min-w-0 flex-1 bg-transparent text-callout outline-none placeholder:text-ink-3"
            />
            <kbd className="rounded-[6px] bg-surface-2 px-1.5 py-0.5 font-sans text-caption text-ink-2">esc</kbd>
          </label>

          <ul id="palette-list" role="listbox" className="no-scrollbar max-h-[60vh] overflow-y-auto p-2">
            {patients !== null && patients.length > 0 && <li className="eyebrow px-3 pb-1 pt-2">Patients</li>}
            {searching && [0, 1].map((i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-2.5"><span className="skeleton h-8 w-8 !rounded-full" /><span className="skeleton h-3.5 w-48" /></li>
            ))}
            {patients !== null && patients.length === 0 && (
              <li className="px-3 py-3 text-footnote text-ink-2">No patient matches “{q.trim()}”. Use Check-in to search by date of birth or ID number.</li>
            )}
            {rows.map((r, i) => {
              const first = r.kind === "screen" && (i === 0 || rows[i - 1].kind === "patient");
              return (
                <li key={r.kind === "patient" ? r.p.id : r.view} role="presentation">
                  {first && <p className="eyebrow px-3 pb-1 pt-3">Go to</p>}
                  <button
                    id={`palette-${i}`} role="option" aria-selected={i === active}
                    onMouseMove={() => setActive(i)} onClick={() => open(r)}
                    className={`flex w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left ${i === active ? "bg-[var(--surface)] shadow-[0_1px_2px_rgb(7_43_39/0.06)]" : ""}`}
                  >
                    {r.kind === "patient" ? (
                      <>
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-tint text-accent"><UserRound size={16} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 truncate text-callout font-semibold">{r.p.fullName}{r.p.identityVerified && <BadgeCheck size={14} className="shrink-0 text-accent" aria-label="Identity verified" />}</span>
                          <span className="mono block text-caption text-ink-2">{r.p.humanetId}</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-ink-2"><r.Icon size={16} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-callout font-medium">{r.label}</span>
                          {r.hint && <span className="block truncate text-caption text-ink-2">{r.hint}</span>}
                        </span>
                      </>
                    )}
                    {i === active ? <CornerDownLeft size={15} className="shrink-0 text-ink-3" /> : <ArrowRight size={15} className="shrink-0 text-transparent" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Overlay>
  );
}
