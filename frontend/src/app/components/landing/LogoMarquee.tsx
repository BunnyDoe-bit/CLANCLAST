const placeholderPartners = [
  "Northline Health",
  "Karoo Medical Group",
  "Union Family Clinics",
  "Baywatch Health Plan",
  "Delta Care Network",
  "Highfield Providers",
];

/**
 * Scrolling "trusted by" strip. These are placeholder, made-up names — swap
 * in real partner wordmarks (as text or SVG) once available.
 */
export function LogoMarquee() {
  const items = [...placeholderPartners, ...placeholderPartners];

  return (
    <section className="border-y border-border bg-background py-10" aria-label="Placeholder partner organizations">
      <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Placeholder — trusted by teams like yours
      </p>
      <div className="overflow-hidden">
        <div className="flex w-max animate-[marquee_28s_linear_infinite] items-center gap-16">
          {items.map((name, i) => (
            <span key={`${name}-${i}`} className="whitespace-nowrap font-display text-xl font-bold text-muted-foreground/50">
              {name}
            </span>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[marquee_28s_linear_infinite\\] { animation: none; }
        }
      `}</style>
    </section>
  );
}
