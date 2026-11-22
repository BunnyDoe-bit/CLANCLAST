import { lazy, memo, Suspense, useState } from "react";

// The shader is its own chunk: first paint shows the CSS fallback, the weave fades in over it.
const CausticWeave = lazy(() => import("./CausticWeave"));

/**
 * CLANCLAST presets for the Caustic Weave. Palettes run valley → crest in brand teals;
 * "card" stops at #5CBBAE so white text on top always keeps its contrast.
 */
const PRESETS = {
  hero: {
    colors: ["#041C19", "#072B27", "#0E3F38", "#1F5D55", "#2C8176", "#3FA99B", "#8DD4CA", "#EAFBF8"],
    background: "#041C19",
    surface: { ramp: 5.5, sheen: 4.5, glow: 2.2, grain: 2, opacity: 100 },
    speed: 8,
    maxDpr: 1.5,
    interactive: true,
  },
  card: {
    colors: ["#041C19", "#072B27", "#0B3631", "#14504A", "#1F6B62", "#2C8176", "#3FA99B", "#5CBBAE"],
    background: "#041C19",
    surface: { ramp: 6, sheen: 3, glow: 1, grain: 1.5, opacity: 100 },
    speed: 6,
    maxDpr: 1.25,
    interactive: false,
  },
} as const;

type Props = {
  preset?: keyof typeof PRESETS;
  /** Darkening for legibility: "bottom" for text at the foot, "even" for text anywhere. */
  scrim?: "none" | "bottom" | "even";
  className?: string;
};

export const BrandWeave = memo(function BrandWeave({ preset = "card", scrim = "even", className = "" }: Props) {
  const [ready, setReady] = useState(false);
  const p = PRESETS[preset];
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} style={{ background: "var(--hero)" }}>
      <Suspense fallback={null}>
        <div className="absolute inset-0 transition-opacity duration-[900ms] ease-out" style={{ opacity: ready ? 1 : 0 }}>
          <CausticWeave
            colors={[...p.colors]}
            background={p.background}
            surface={p.surface}
            speed={p.speed}
            maxDpr={p.maxDpr}
            interactive={p.interactive}
            sensitivity={6}
            onReady={() => setReady(true)}
          />
        </div>
      </Suspense>
      {scrim === "bottom" && <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(4_28_25/0.05)_0%,rgb(4_28_25/0.25)_40%,rgb(4_28_25/0.82)_72%,rgb(4_28_25/0.94)_100%)]" />}
      {scrim === "even" && <div className="absolute inset-0 bg-[rgb(4_28_25/0.38)]" />}
    </div>
  );
});
