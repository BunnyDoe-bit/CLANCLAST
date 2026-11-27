import { useEffect, useState } from "react";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { Sheet } from "../ui/Sheet";

/**
 * Help & support. Replaces the old floating widget (which covered content on phones):
 * the sheet opens from Account › Help and the welcome screen's "Get help".
 * Only available when VITE_SUPPORT_URL is configured.
 */
const SUPPORT_URL = (import.meta.env.VITE_SUPPORT_URL as string | undefined)?.replace(/\/$/, "");
export const supportEnabled = !!SUPPORT_URL;

const OPEN = "cc:open-support";
export const openSupport = () => window.dispatchEvent(new Event(OPEN));

// Keep the last 5 JS errors (message only, truncated) so reports arrive with useful context.
const recentErrors: string[] = [];
const keep = (m: string) => { recentErrors.push(m.slice(0, 160)); if (recentErrors.length > 5) recentErrors.shift(); };
if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => keep(String(e.message)));
  window.addEventListener("unhandledrejection", (e) => keep("Unhandled: " + String((e.reason as { message?: string })?.message ?? e.reason)));
}

const CATEGORIES = [
  ["help", "I need help"],
  ["access", "Can't sign in"],
  ["bug", "Something's broken"],
  ["feature", "Suggestion"],
] as const;

const EMPTY = { category: "help", subject: "", description: "", email: "", website: "" };

/** Mount once inside the app container; listens for openSupport(). */
export function SupportHost() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [f, setF] = useState(EMPTY);

  useEffect(() => {
    const show = () => { setRef(null); setError(""); setOpen(true); };
    window.addEventListener(OPEN, show);
    return () => window.removeEventListener(OPEN, show);
  }, []);

  if (!SUPPORT_URL || !open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch(`${SUPPORT_URL}/api/ticket`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          app: "provider", category: f.category, subject: f.subject, description: f.description, reporter_email: f.email, website: f.website,
          context: {
            page: window.location.pathname, userAgent: navigator.userAgent, viewport: `${window.innerWidth}x${window.innerHeight}`,
            language: navigator.language, appVersion: import.meta.env.VITE_APP_VERSION, errors: recentErrors,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setRef(data.ref ?? "—");
      setF(EMPTY);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title={ref ? "Thanks, we've got it" : "Get help"} close={() => setOpen(false)}>
      {ref ? (
        <div className="py-4 text-center">
          <CheckCircle2 className="mx-auto text-accent" size={44} strokeWidth={1.6} />
          <p className="mt-3 text-callout">Your reference is <b className="mono">{ref}</b>.</p>
          <p className="mt-1 text-footnote text-ink-2">We'll reply by email if you left one.</p>
          <button onClick={() => setOpen(false)} className="btn btn-primary btn-lg btn-block mt-6">Done</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="flex items-start gap-2 rounded-[14px] bg-warning-tint px-3.5 py-2.5 text-footnote text-warning">
            <ShieldAlert size={16} className="mt-px shrink-0" />
            Please don't include ID numbers or health details. We never need them to help you.
          </p>
          <fieldset>
            <legend className="field-label">What's it about?</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(([v, l]) => (
                <button
                  key={v} type="button" aria-pressed={f.category === v} onClick={() => setF({ ...f, category: v })}
                  className={`h-9 rounded-full px-3.5 text-footnote font-semibold transition-colors duration-150 ${f.category === v ? "bg-ink text-[var(--canvas-base)]" : "bg-surface-2 text-ink-2"}`}
                >{l}</button>
              ))}
            </div>
          </fieldset>
          <label className="field">
            <span className="field-label">Short summary</span>
            <input className="input" required minLength={4} maxLength={140} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
          </label>
          <label className="field">
            <span className="field-label">What happened?</span>
            <textarea className="input h-28 resize-none py-3" required minLength={10} maxLength={4000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </label>
          <label className="field">
            <span className="field-label">Email for a reply (optional)</span>
            <input className="input" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </label>
          {/* honeypot: hidden from people, bots fill it */}
          <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" name="website" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
          {error && <p role="alert" className="rounded-[14px] bg-critical-tint px-3.5 py-2.5 text-footnote text-critical">{error}</p>}
          <button disabled={busy} className="btn btn-primary btn-lg btn-block">{busy ? "Sending…" : "Send"}</button>
        </form>
      )}
    </Sheet>
  );
}
