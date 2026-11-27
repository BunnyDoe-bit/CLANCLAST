import { memo } from "react";

/**
 * CLANCLAST brand assets. Files live in /public/brand (outlined text, no embedded
 * fonts, ~11 KB gzipped) so they are cached once and never enter the JS bundle.
 * Width/height are always set from the intrinsic aspect ratio to prevent layout shift.
 */
const ASSETS = {
  "horizontal-ink": { w: 4705, h: 1021 },
  "horizontal-white": { w: 4705, h: 1021 },
  "horizontal-on-dark": { w: 4705, h: 1021 },
  "stacked-ink": { w: 2230, h: 1655 },
  "stacked-white": { w: 2230, h: 1655 },
  "mark-ink": { w: 1064, h: 1021 },
  "mark-white": { w: 1064, h: 1021 },
  "mark-color": { w: 1064, h: 1021 },
} as const;

type Variant = keyof typeof ASSETS;
type Layout = "horizontal" | "stacked" | "mark";

/** Which file to show on a light surface and which on a dark one. */
const PAIRS: Record<Layout, { light: Variant; dark: Variant }> = {
  horizontal: { light: "horizontal-ink", dark: "horizontal-on-dark" },
  stacked: { light: "stacked-ink", dark: "stacked-white" },
  mark: { light: "mark-ink", dark: "mark-color" },
};

const src = (v: Variant) => `/brand/clanclast-${v}.svg`;

type Props = {
  layout?: Layout;
  /** Rendered height in px; width follows the aspect ratio. */
  height: number;
  /**
   * "auto" follows the app theme (swaps at the dark-mode token boundary);
   * "light"/"dark" pin it for surfaces whose colour never changes (e.g. the brand panel).
   */
  surface?: "auto" | "light" | "dark";
  className?: string;
  priority?: boolean;
};

export const Logo = memo(function Logo({ layout = "horizontal", height, surface = "auto", className = "", priority = false }: Props) {
  const pair = PAIRS[layout];
  const a = ASSETS[pair.light];
  const width = Math.round((height * a.w) / a.h);
  const common = { width, height, alt: "", decoding: "async" as const, loading: priority ? ("eager" as const) : ("lazy" as const), draggable: false };

  if (surface !== "auto") {
    return <img {...common} alt="CLANCLAST Health" src={src(surface === "dark" ? pair.dark : pair.light)} className={`shrink-0 select-none ${className}`} />;
  }
  // Both are cached after first paint; CSS picks one so a theme change never refetches or shifts.
  return (
    <span role="img" aria-label="CLANCLAST Health" className={`relative inline-block shrink-0 select-none ${className}`} style={{ width, height }}>
      <img {...common} src={src(pair.light)} className="logo-light absolute inset-0" />
      <img {...common} src={src(pair.dark)} className="logo-dark absolute inset-0" />
    </span>
  );
});
