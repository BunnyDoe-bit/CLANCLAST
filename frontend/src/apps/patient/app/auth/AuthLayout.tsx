import type { ReactNode } from "react";
import { ChevronLeft, FileSignature, Handshake, ShieldCheck } from "lucide-react";
import { Logo } from "../brand/Logo";
import { BrandWeave } from "../brand/BrandWeave";

/** The Canon, in the patient's words. */
export const PRINCIPLES = [
  { Icon: Handshake, title: "You own your consent", body: "Nothing is shared without your approval, and you can revoke it." },
  { Icon: FileSignature, title: "Signed at source", body: "Your clinic signs each summary. Any change breaks the signature." },
  { Icon: ShieldCheck, title: "We never hold your records", body: "Your clinics keep them. CLANCLAST only connects them." },
];

type AuthLayoutProps = {
  onBack?: () => void;
  eyebrow?: string;
  title: string;
  sub?: string;
  progress?: { step: number; total: number };
  children: ReactNode;
};

/**
 * Sign in / registration. Phone: dark brand header with a frosted sheet rising over it.
 * Wide: the same two pieces as a centred stack on the ambient canvas.
 */
export function AuthLayout({ onBack, eyebrow, title, sub, progress, children }: AuthLayoutProps) {
  return (
    <div className="ambient h-full text-ink">
      <div className="scroll-area no-scrollbar h-full">
        <div className="mx-auto flex min-h-full w-full flex-col @4xl/app:max-w-[480px] @4xl/app:justify-center @4xl/app:py-10">
          <header
            className="hero shrink-0 rounded-none px-6 pb-14 @4xl/app:rounded-[var(--radius-card)] @4xl/app:pb-8"
            style={{ paddingTop: "calc(var(--safe-top) + 8px)" }}
          >
            <BrandWeave preset="card" scrim="even" />
            <div className="relative z-10">
            <div className="flex h-[var(--topbar-h)] items-center justify-between">
              {onBack ? (
                <button onClick={onBack} aria-label="Back" className="btn-glass-dark -ml-1 grid h-10 w-10 place-items-center rounded-full transition-transform duration-150 ease-spring active:scale-90">
                  <ChevronLeft size={22} strokeWidth={2} />
                </button>
              ) : <span className="h-10 w-10" />}
              <Logo layout="horizontal" height={24} surface="dark" priority />
            </div>

            {progress && (
              <div className="mt-5 flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={progress.total} aria-valuenow={progress.step} aria-label="Registration progress">
                {Array.from({ length: progress.total }, (_, n) => (
                  <i key={n} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${n < progress.step ? "bg-[var(--brand-300)]" : "bg-white/15"}`} />
                ))}
              </div>
            )}

            {eyebrow && <p className="tnum mt-6 text-caption font-semibold uppercase tracking-[0.14em] text-[var(--brand-300)]">{eyebrow}</p>}
            <h1 className="large-title mt-1.5 !text-white">{title}</h1>
            {sub && <p className="mt-2 text-callout text-white/75">{sub}</p>}
            </div>
          </header>

          <div
            className="auth-sheet relative -mt-8 flex-1 rounded-t-[32px] bg-[var(--canvas-base)] px-6 pt-7"
            style={{ paddingBottom: "calc(var(--safe-bottom) + 32px)" }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
