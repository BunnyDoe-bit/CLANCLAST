import { useRef } from "react";
import { useNetworkSphereScene } from "./useNetworkSphereScene";

/**
 * Full-bleed interactive hero. Visual language shifted from a dark backdrop
 * to a warm, glassy light background (soft cream base + blurred mint blob +
 * fine grain), matching the reference moodboard, while keeping the globe
 * interaction model unchanged (continents-shaped node sphere, cursor
 * bounce, scroll morph into a patient figure). The globe is pushed back
 * and sized so the two-line "CLANCLAST / HEALTH" wordmark sits clearly
 * inside its silhouette. A soft central glow pulses on its own heartbeat
 * rhythm, independent of the scroll-driven morph.
 *
 * The shared, scroll-aware Navbar now lives outside this component (see
 * Navbar.tsx) so it can stay fixed across every section, not just the hero.
 */
export function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useNetworkSphereScene({ canvasRef, sectionRef, titleRef, captionRef, progressRef });

  return (
    <section ref={sectionRef} className="relative" style={{ height: "260vh" }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* ---- glassy light background: cream base + blurred mint blob + grain ---- */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, #f4efe4 0%, #ece4d3 55%, #e3dac6 100%)" }}
        />
        <div
          className="absolute left-1/2 top-[8%] h-[70vh] w-[70vh] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(143,217,196,0.65) 0%, rgba(143,217,196,0.25) 45%, transparent 75%)" }}
        />
        <div
          className="absolute right-[8%] top-[35%] h-[42vh] w-[42vh] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(20,92,82,0.35), transparent 70%)" }}
        />
        {/* fine grain for a "high-resolution glass" texture rather than a flat gradient */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.05] mix-blend-overlay" aria-hidden="true">
          <filter id="hero-grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" /></filter>
          <rect width="100%" height="100%" filter="url(#hero-grain)" />
        </svg>

        {/* ---- title, stacked two lines, sized to sit inside the globe ---- */}
        <div
          ref={titleRef}
          className="pointer-events-none absolute left-1/2 top-1/2 z-[5] flex -translate-x-1/2 -translate-y-1/2 select-none flex-col items-center text-center"
        >
          <span
            className="font-display font-extrabold leading-[0.95] tracking-[-0.02em]"
            style={{ fontSize: "clamp(30px, 5.4vw, 64px)", color: "#0d3a32" }}
          >
            CLANCLAST
          </span>
          <span
            className="font-display font-extrabold leading-[0.95] tracking-[-0.02em]"
            style={{ fontSize: "clamp(30px, 5.4vw, 64px)", color: "#145c52" }}
          >
            HEALTH
          </span>
        </div>

        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-[3] h-full w-full"
          role="img"
          aria-label="Animated network of connected nodes with a pulsing central glow, which transforms into a human figure as you scroll"
        />

        <div
          ref={progressRef}
          className="absolute right-6 top-1/2 z-[5] hidden -translate-y-1/2 font-mono text-xs tracking-[.1em] text-[#145c52]/50 sm:block"
          style={{ writingMode: "vertical-rl" }}
        >
          SCROLL — 000
        </div>

        <div
          ref={captionRef}
          className="absolute bottom-[74px] left-1/2 z-[4] max-w-[440px] -translate-x-1/2 text-center font-body text-sm text-[#0d3a32]/70 opacity-0 transition-opacity duration-500"
        >
          One connected record. Every provider, every touchpoint, one patient.
        </div>

        <div className="absolute inset-x-0 bottom-0 z-[5] flex items-center justify-between px-6 py-6 text-[12.5px] text-[#0d3a32]/60 sm:px-10">
          <div className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#145c52]" />
            Move cursor to wake the network
          </div>
          <div>Scroll to begin the journey</div>
        </div>
      </div>
    </section>
  );
}
