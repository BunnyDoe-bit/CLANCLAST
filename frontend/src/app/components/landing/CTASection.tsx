import type { LandingContext } from "./AccessTiles";

export function CTASection({ setContext }: { setContext: (c: LandingContext) => void }) {
  return (
    <section className="relative overflow-hidden bg-background py-24" aria-labelledby="cta-heading">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-60">
        <div className="h-[520px] w-[520px] rounded-full bg-accent/60 blur-3xl" />
      </div>
      <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 text-center sm:px-10">
        <h2 id="cta-heading" className="font-display text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
          Bring your identity and consent layer into the future.
        </h2>
        <p className="text-base leading-7 text-muted-foreground">
          Connect with the ClanClast team, or jump straight into the platform to see it working.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setContext("provider")}
            className="rounded-full bg-primary px-7 py-3 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            For care teams
          </button>
          <button
            onClick={() => setContext("patient")}
            className="rounded-full border border-border bg-white px-7 py-3 text-sm font-bold text-foreground transition hover:-translate-y-0.5 hover:border-primary/40"
          >
            For patients
          </button>
        </div>
      </div>
    </section>
  );
}
