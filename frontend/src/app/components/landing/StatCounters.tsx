import { useEffect, useRef, useState } from "react";

interface Stat {
  percent: number;
  headline: string;
}

const stats: Stat[] = [
  { percent: 62, headline: "Fewer duplicate intake forms per referral" },
  { percent: 40, headline: "Faster average referral-to-appointment time" },
  { percent: 28, headline: "Reduction in missed follow-up visits" },
  { percent: 35, headline: "Of care teams report fewer record requests" },
];

function StatRing({ percent, headline, delay }: Stat & { delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          if (prefersReducedMotion) {
            setDisplay(percent);
            return;
          }
          const duration = 1400;
          const start = performance.now();
          function tick(now: number) {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(Math.round(eased * percent));
            if (t < 1) requestAnimationFrame(tick);
          }
          setTimeout(() => requestAnimationFrame(tick), delay);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percent, delay]);

  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * display) / 100;

  return (
    <div ref={ref} className="flex flex-col items-center gap-5 text-center">
      <div className="relative h-[148px] w-[148px]">
        <svg viewBox="0 0 148 148" className="h-full w-full -rotate-90">
          <circle cx="74" cy="74" r={radius} fill="none" stroke="var(--border)" strokeWidth="8" />
          <circle
            cx="74"
            cy="74"
            r={radius}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-display text-3xl font-extrabold text-foreground">
          {display}%
        </div>
      </div>
      <p className="max-w-[22ch] text-sm leading-6 text-muted-foreground">{headline}</p>
    </div>
  );
}

/**
 * Animated circular progress stats. The figures here are placeholders —
 * swap in ClanClast's real numbers before shipping.
 */
export function StatCounters() {
  return (
    <section className="bg-[#f7f9f7] py-20" aria-labelledby="stats-heading">
      <div className="mx-auto max-w-7xl px-6 text-center sm:px-10">
        <p className="mb-3 text-sm font-semibold text-primary">Illustrative — replace with real figures</p>
        <h2 id="stats-heading" className="mx-auto mb-4 max-w-2xl font-display text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
          Lowering the operational cost of care, one connection at a time.
        </h2>
        <p className="mx-auto mb-14 max-w-xl text-base leading-7 text-muted-foreground">
          Placeholder figures shown for layout — drop in ClanClast's validated numbers when they're ready.
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-4">
          {stats.map((s, i) => (
            <StatRing key={s.headline} {...s} delay={i * 120} />
          ))}
        </div>
      </div>
    </section>
  );
}
