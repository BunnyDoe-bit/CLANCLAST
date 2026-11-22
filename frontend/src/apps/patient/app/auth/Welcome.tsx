import { Lock } from "lucide-react";
import { Logo } from "../brand/Logo";
import { BrandWeave } from "../brand/BrandWeave";
import { PRINCIPLES } from "./AuthLayout";

type Props = { onCreate: () => void; onSignIn: () => void; onAssist: () => void; onHelp: () => void };

/** Dark, immersive first impression — the stacked white mark on a soft brand glow. */
export function Welcome({ onCreate, onSignIn, onAssist, onHelp }: Props) {
  return (
    <div className="welcome-bg relative h-full text-white">
      <BrandWeave preset="hero" scrim="bottom" />
      {/* Soft pool of shade behind the copy so the brightest ribbons never sit under text */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_42%_at_50%_62%,rgb(4_28_25/0.72)_0%,rgb(4_28_25/0.35)_55%,transparent_100%)]" />
      <div className="scroll-area no-scrollbar relative z-10 h-full">
        <div
          className="mx-auto flex min-h-full w-full max-w-[440px] flex-col px-6 @4xl/app:max-w-[960px] @4xl/app:px-10"
          style={{ paddingTop: "calc(var(--safe-top) + 24px)", paddingBottom: "calc(var(--safe-bottom) + 24px)" }}
        >
          <div className="enter-fade grid flex-1 place-items-center py-10">
            <span className="@4xl/app:hidden"><Logo layout="stacked" height={150} surface="dark" priority /></span>
            <span className="hidden @4xl/app:block"><Logo layout="stacked" height={190} surface="dark" priority /></span>
          </div>

          <div className="enter mx-auto w-full max-w-[420px] text-center">
            <h1 className="large-title text-balance !text-white @4xl/app:text-[2.5rem] @4xl/app:leading-[2.875rem]">Your health identity, in your hands.</h1>
            <p className="mt-3 text-callout text-white/70 text-pretty">
              Carry signed summaries from your clinics, choose what each provider sees, and see every time they are checked.
            </p>

            <div className="mt-8 grid gap-2.5">
              <button onClick={onCreate} className="btn btn-inverse btn-lg btn-block">Create your CLANCLAST ID</button>
              <button onClick={onSignIn} className="btn btn-glass-dark btn-lg btn-block">Sign in</button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-1 text-footnote">
              <button onClick={onAssist} className="btn min-h-9 px-2 font-medium text-white/75 hover:text-white">Registering at a clinic?</button>
              <span aria-hidden="true" className="text-white/30">·</span>
              <button onClick={onHelp} className="btn min-h-9 px-2 font-medium text-white/75 hover:text-white">Get help</button>
            </div>
          </div>

          {/* Wide layouts: the Canon as three frosted tiles */}
          <ul className="mt-14 hidden grid-cols-3 gap-3 @4xl/app:grid">
            {PRINCIPLES.map(({ Icon, title, body }) => (
              <li key={title} className="rounded-[20px] border border-white/12 bg-[rgb(4_28_25/0.45)] p-5 backdrop-blur-md">
                <Icon size={20} strokeWidth={1.7} className="text-[var(--brand-300)]" />
                <p className="mt-3 text-subhead font-semibold">{title}</p>
                <p className="mt-1 text-footnote text-white/60">{body}</p>
              </li>
            ))}
          </ul>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-caption text-white/55">
            <Lock size={12} strokeWidth={2} aria-hidden="true" />
            CLANCLAST never stores your clinical records.
          </p>
        </div>
      </div>
    </div>
  );
}
