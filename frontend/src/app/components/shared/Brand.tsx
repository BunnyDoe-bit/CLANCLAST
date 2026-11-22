/**
 * CLANCLAST logo, from the approved brand files in /public/brand (the same files the live apps use).
 * Width always follows the file's aspect ratio, so the layout never shifts while it loads.
 *
 * surface: "auto" follows the light/dark theme; "light" / "dark" pin it for surfaces whose
 * colour never changes (the landing header, the brand hero panels).
 */
const ASSETS = {
  "horizontal-ink": { w: 4705, h: 1021 },
  "horizontal-on-dark": { w: 4705, h: 1021 },
  "mark-ink": { w: 1064, h: 1021 },
  "mark-color": { w: 1064, h: 1021 },
} as const;
type Variant = keyof typeof ASSETS;
const src = (v: Variant) => `/brand/clanclast-${v}.svg`;

export function Logo({ mark = false, height, surface = "auto", priority = false }: { mark?: boolean; height: number; surface?: "auto" | "light" | "dark"; priority?: boolean }) {
  const light: Variant = mark ? "mark-ink" : "horizontal-ink";
  const dark: Variant = mark ? "mark-color" : "horizontal-on-dark";
  const a = ASSETS[light];
  const width = Math.round((height * a.w) / a.h);
  const common = { width, height, alt: "", decoding: "async" as const, loading: priority ? ("eager" as const) : ("lazy" as const), draggable: false };
  if (surface !== "auto") {
    return <img {...common} alt="CLANCLAST" src={src(surface === "dark" ? dark : light)} className="block shrink-0 select-none" />;
  }
  return (
    <span role="img" aria-label="CLANCLAST" className="relative inline-block shrink-0 select-none align-middle" style={{ width, height }}>
      <img {...common} src={src(light)} className="logo-light absolute inset-0" />
      <img {...common} src={src(dark)} className="logo-dark absolute inset-0" />
    </span>
  );
}

/** Kept for the existing screens: `<Brand />` on theme surfaces, `<Brand dark />` on the brand hero. */
export function Brand({ dark = false, height = 30 }: { dark?: boolean; height?: number }) {
  return <Logo height={height} surface={dark ? "dark" : "auto"} priority />;
}
