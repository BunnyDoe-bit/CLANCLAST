import { useEffect, useRef, useState } from "react";
import { landingImages } from "./landingAssets";

interface Testimonial {
  name: string;
  role: string;
  quote: string;
  image: { src: string; width: number; height: number; alt: string };
}

const testimonials: Testimonial[] = [
  {
    name: "Placeholder name",
    role: "Placeholder — Care Coordinator",
    quote:
      "This is placeholder quote copy standing in for a real testimonial. It should describe, in the member's own words, what changed once referrals stopped needing a phone call.",
    image: landingImages.followUpStage,
  },
  {
    name: "Placeholder name",
    role: "Placeholder — Clinic Operations Lead",
    quote:
      "Another placeholder quote. Swap this out for a real quote about intake, consent, or reduced duplicate paperwork once you have one on file.",
    image: landingImages.careStage,
  },
  {
    name: "Placeholder name",
    role: "Placeholder — Patient",
    quote:
      "A third placeholder quote, written from a patient's perspective, about feeling less like they had to repeat their history at every visit.",
    image: landingImages.referralStage,
  },
];

const CYCLE_MS = 6000;

/**
 * Tabbed testimonials with an auto-advancing progress bar per tab. All
 * quotes and names below are placeholders — replace with real, attributed
 * feedback before this goes live.
 */
export function TestimonialTabs() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let raf = 0;
    let start = performance.now();

    function tick(now: number) {
      if (!pausedRef.current) {
        const elapsed = now - start;
        const pct = Math.min(100, (elapsed / CYCLE_MS) * 100);
        setProgress(pct);
        if (pct >= 100) {
          setActive((a) => (a + 1) % testimonials.length);
          start = now;
          setProgress(0);
        }
      } else {
        start = now - (progress / 100) * CYCLE_MS;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function selectTab(i: number) {
    setActive(i);
    setProgress(0);
  }

  const current = testimonials[active];

  return (
    <section className="bg-[#04100c] py-20 text-white" aria-labelledby="testimonials-heading">
      <div className="mx-auto max-w-5xl px-6 text-center sm:px-10">
        <p className="mb-3 text-sm font-semibold text-[#8fd9c4]">Placeholder — replace with real, attributed quotes</p>
        <h2 id="testimonials-heading" className="mb-10 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
          What people said, once it stopped feeling like paperwork.
        </h2>

        <div
          className="mb-8 flex justify-center gap-3"
          onMouseEnter={() => (pausedRef.current = true)}
          onMouseLeave={() => (pausedRef.current = false)}
        >
          {testimonials.map((t, i) => (
            <button
              key={i}
              onClick={() => selectTab(i)}
              aria-label={`Testimonial ${i + 1}`}
              className="h-[3px] w-16 overflow-hidden rounded-full bg-white/15"
            >
              <span
                className="block h-full bg-[#8fd9c4]"
                style={{ width: `${i === active ? progress : i < active ? 100 : 0}%`, transition: i === active ? "none" : "width 0.3s" }}
              />
            </button>
          ))}
        </div>

        <div className="grid items-center gap-10 text-left sm:grid-cols-[220px_1fr]">
          <div className="mx-auto h-[220px] w-[220px] overflow-hidden rounded-[26px] sm:mx-0">
            <img
              src={current.image.src}
              width={current.image.width}
              height={current.image.height}
              alt={current.image.alt}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="mb-6 font-display text-xl font-semibold leading-relaxed sm:text-2xl">“{current.quote}”</p>
            <p className="text-sm font-bold">{current.name}</p>
            <p className="text-sm text-white/55">{current.role}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
