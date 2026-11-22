import { Hero } from "./Hero";
import { Navbar } from "./Navbar";
import { AccessTiles, type LandingContext } from "./AccessTiles";
import { ServicePillars } from "./ServicePillars";
import { StatCounters } from "./StatCounters";
import { PatientJourney } from "./PatientJourney";
import { LogoMarquee } from "./LogoMarquee";
import { TestimonialTabs } from "./TestimonialTabs";
import { TrustStrip } from "./TrustStrip";
import { CTASection } from "./CTASection";
import { TrustFooter } from "./TrustFooter";

/**
 * ClanClast Health marketing landing page.
 *
 * Structure follows a professional, section-by-section pattern (hero →
 * pillar cards → stats → access tiles → patient journey → partner strip →
 * testimonials → interoperability/trust → closing CTA), built with
 * ClanClast's own design tokens (theme.css) and Manrope/DM Sans typography
 * throughout. All content is original; stats, testimonials and partner
 * names are explicitly labeled as placeholders.
 *
 * Replaces the previous Landing() function in App.tsx — same setContext
 * contract, so navigation into the working patient/provider/connect/verify
 * app is unchanged.
 */
export function ClanClastLanding({ setContext }: { setContext: (c: LandingContext) => void }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <ServicePillars />
      <StatCounters />
      <AccessTiles setContext={setContext} />
      <PatientJourney />
      <LogoMarquee />
      <TestimonialTabs />
      <TrustStrip />
      <CTASection setContext={setContext} />
      <TrustFooter />
    </div>
  );
}
