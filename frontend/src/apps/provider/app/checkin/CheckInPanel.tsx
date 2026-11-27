import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Check, FileText, Handshake, IdCard, RotateCcw, ShieldAlert } from "lucide-react";
import { ApiError, providerApi, type IdentityDocument, type PatientRef } from "../../lib/api";
import { navigate } from "../lib/router";
import { DOCUMENTS } from "../lib/identity";
import { Segmented } from "../ui/controls";

/**
 * The second half of every check-in, however the patient was found: who they are,
 * whether their identity has been checked against a document, and the check-in itself.
 * Each step is optimistic — the screen moves on at once and rolls back if the server refuses.
 */
export function CheckInPanel({ patient: initial, via, onReset, preventedDuplicate = false }: { patient: PatientRef; via: string; onReset: () => void; preventedDuplicate?: boolean }) {
  const [p, setP] = useState(initial);
  const [doc, setDoc] = useState<IdentityDocument>("SA_ID");
  const [checked, setChecked] = useState(false);
  const [state, setState] = useState<"idle" | "confirming" | "checking-in" | "done">("idle");
  const [error, setError] = useState("");
  const ref = useRef<HTMLElement>(null);

  // On narrow layouts the panel sits below the finder; bring it into view.
  useEffect(() => { ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, []);

  async function confirmIdentity() {
    setError(""); setState("confirming");
    setP((x) => ({ ...x, identityVerified: true }));
    try { await providerApi.confirmIdentity(p.id, doc); setState("idle"); }
    catch (e) { setP((x) => ({ ...x, identityVerified: false })); setState("idle"); setError(e instanceof ApiError ? e.message : "Couldn’t save. Check your connection."); }
  }

  async function checkIn() {
    setError(""); setState("done");
    try { await providerApi.confirmCheckin(p.id, preventedDuplicate); }
    catch (e) { setState("idle"); setError(e instanceof ApiError ? e.message : "Couldn’t check in. Check your connection."); }
  }

  return (
    <section ref={ref} className="glass enter scroll-mt-24 overflow-hidden">
      <div className="flex items-start gap-4 p-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-callout font-semibold text-[var(--canvas-base)]">
          {p.fullName.split(/\s+/).slice(0, 2).map((w) => w[0]).join("")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-title-3 font-semibold">{p.fullName}</p>
          <p className="mono mt-0.5 text-subhead text-ink-2">{p.humanetId}</p>
          <p className="mt-1.5 text-caption text-ink-3">Found by {via}</p>
        </div>
        {p.identityVerified
          ? <span className="badge shrink-0 bg-positive-tint text-positive"><BadgeCheck size={13} strokeWidth={2.4} /> Identity verified</span>
          : <span className="badge shrink-0 bg-warning-tint text-warning">Identity check pending</span>}
      </div>

      {!p.identityVerified && state !== "done" && (
        <div className="border-t border-hairline p-5">
          <div className="flex items-start gap-3">
            <IdCard size={20} className="mt-0.5 shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <p className="text-callout font-semibold">Check an official document</p>
              <p className="mt-0.5 text-footnote text-ink-2">Nobody has checked this ID against a document yet. Compare one with the name above before you rely on it. The check is recorded in their access log.</p>
              <div className="mt-3 max-w-[340px]"><Segmented label="Document" size="sm" value={doc} onChange={setDoc} options={DOCUMENTS.map((d) => ({ v: d.v, label: d.label }))} /></div>
              <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-footnote">
                <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
                <span>The document matches this person and the name above.</span>
              </label>
              <button onClick={confirmIdentity} disabled={!checked || state === "confirming"} className="btn btn-quiet mt-3"><ShieldAlert size={16} /> Mark identity as verified</button>
            </div>
          </div>
        </div>
      )}

      {error && <p role="alert" className="mx-5 mb-4 rounded-[14px] bg-critical-tint px-3.5 py-2.5 text-footnote text-critical">{error}</p>}

      <div className="border-t border-hairline bg-[var(--glass)] p-4">
        {state === "done" ? (
          <div className="enter flex flex-wrap items-center justify-end gap-2">
            <span className="mr-auto flex basis-full items-center gap-2.5 pb-1 text-callout font-semibold @md/app:basis-auto @md/app:pb-0">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-positive text-white"><Check size={16} strokeWidth={3} /></span>
              Checked in
            </span>
            <button onClick={() => navigate("patient", { search: `id=${p.id}` })} className="btn btn-quiet"><FileText size={16} /> Open patient</button>
            <button onClick={() => navigate("consent", { search: `request=${p.id}` })} className="btn btn-quiet"><Handshake size={16} /> Request access</button>
            <button onClick={onReset} className="btn btn-primary"><RotateCcw size={16} /> Next patient</button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button onClick={onReset} className="btn btn-quiet">Not them</button>
            <button onClick={checkIn} className="btn btn-primary">Check in {p.fullName.split(" ")[0]}</button>
          </div>
        )}
      </div>
    </section>
  );
}
