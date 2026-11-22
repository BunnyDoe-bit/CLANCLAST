import { useEffect, type RefObject } from "react";

/**
 * Drives a horizontally-scrolling text track from vertical scroll position
 * while its parent section is pinned (via CSS position: sticky). Used for
 * each of the four patient-journey stages.
 */
export function useMarquee(sectionRef: RefObject<HTMLDivElement>, trackRef: RefObject<HTMLDivElement>) {
  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function update() {
      if (!section || !track) return;
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      let t = total > 0 ? (-rect.top) / total : 0;
      t = Math.min(1, Math.max(0, t));
      const trackWidth = track.scrollWidth - window.innerWidth;
      const x = prefersReducedMotion ? 0 : -t * trackWidth * 0.7;
      track.style.transform = `translateX(${x}px)`;
    }

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [sectionRef, trackRef]);
}
