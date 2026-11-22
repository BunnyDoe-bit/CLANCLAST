import { useEffect, useState } from "react";
import { Brand } from "../shared/Brand";
import { PillStatus } from "../shared/PillStatus";

const SCROLL_THRESHOLD = 72;

/**
 * Fixed navbar shared across the whole landing page. Transparent over the
 * light hero background; once the page scrolls past the threshold it picks
 * up a frosted-glass white background, a hairline border and a soft shadow
 * so it stays legible over every section beneath it.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[100] transition-all duration-300 ${
        scrolled
          ? "border-b border-border/60 bg-white/75 shadow-[0_8px_30px_-20px_rgba(20,75,62,0.4)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10">
        <Brand />
        <nav className="hidden items-center gap-7 text-sm font-semibold text-foreground/80 md:flex">
          <a href="#pillars-heading" className="transition hover:text-primary">Platform</a>
          <a href="#stats-heading" className="transition hover:text-primary">Impact</a>
          <a href="#testimonials-heading" className="transition hover:text-primary">Stories</a>
          <a href="#cta-heading" className="transition hover:text-primary">Contact</a>
        </nav>
        <div className="hidden items-center gap-4 md:flex">
          <span className="text-sm text-muted-foreground">South Africa</span>
          <PillStatus>Trusted network</PillStatus>
        </div>
      </div>
    </header>
  );
}
