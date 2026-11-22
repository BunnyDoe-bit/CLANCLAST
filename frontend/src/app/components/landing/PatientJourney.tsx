import { useRef, type ReactNode } from "react";
import { useMarquee } from "./useMarquee";
import { journeyIcons } from "./landingAssets";

interface IconChipProps {
  icon: { src: string; width: number; height: number };
}

function IconChip({ icon }: IconChipProps) {
  return (
    <div className="mx-8 flex h-[70px] w-[70px] flex-shrink-0 items-center justify-center rounded-3xl border border-primary/25 bg-primary/[0.06] sm:h-[110px] sm:w-[110px]" aria-hidden="true">
      <img src={icon.src} width={icon.width} height={icon.height} alt="" loading="lazy" className="h-[58%] w-[58%] object-contain" />
    </div>
  );
}

function Word({ children, filled = false }: { children: ReactNode; filled?: boolean }) {
  return (
    <span
      className={`px-7 font-display font-extrabold leading-none ${filled ? "text-foreground" : "text-transparent"}`}
      style={{
        fontSize: "clamp(48px, 11vw, 160px)",
        WebkitTextStroke: filled ? undefined : "1.5px var(--foreground)",
      }}
    >
      {children}
    </span>
  );
}

interface StageProps {
  index: string;
  label: string;
  caption: ReactNode;
  children: ReactNode;
}

function Stage({ index, label, caption, children }: StageProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  useMarquee(sectionRef, trackRef);

  return (
    <div ref={sectionRef} className="relative" style={{ height: "320vh" }}>
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden bg-background">
        <div className="absolute left-6 top-12 text-xs tracking-wide text-muted-foreground sm:left-10">
          {index} — <span className="font-bold text-primary">{label}</span>
        </div>
        <div ref={trackRef} className="flex items-center whitespace-nowrap will-change-transform">
          {children}
        </div>
        <div className="absolute inset-x-0 bottom-16 px-6 text-center text-sm text-muted-foreground sm:px-10">
          {caption}
        </div>
      </div>
    </div>
  );
}

/**
 * The four-stage patient journey: referral, intake, care, follow-up. Each
 * stage is a pinned, horizontally-scrolling marquee driven by the section's
 * own scroll progress (see useMarquee), matching the interaction from the
 * ClanClast prototype. Brand icons stand in for illustrative motifs inline
 * with the text.
 */
export function PatientJourney() {
  return (
    <section aria-labelledby="journey-heading">
      <div className="mx-auto max-w-2xl px-6 pb-20 pt-24 text-center sm:px-10">
        <p className="mb-3.5 text-sm font-semibold text-primary">From data to care</p>
        <h2 id="journey-heading" className="mb-4 font-display text-3xl font-extrabold leading-tight text-foreground sm:text-5xl">
          Every lit line on that globe is a connection that used to be a phone call.
        </h2>
        <p className="text-base leading-7 text-muted-foreground">
          Follow one referral through the system to see what interoperability actually changes for a patient.
        </p>
      </div>

      <Stage
        index="01 / 04"
        label="REFERRAL"
        caption={<>A referral enters the network and finds the <b className="font-semibold text-foreground">right provider automatically</b> — no faxes, no phone tag.</>}
      >
        <Word filled>REFERRED</Word>
        <IconChip icon={journeyIcons.person} />
        <Word>MATCHED</Word>
        <Word filled>TO&nbsp;CARE</Word>
        <IconChip icon={journeyIcons.networkHub} />
        <Word>ROUTED&nbsp;IN&nbsp;MINUTES</Word>
        <Word filled>REFERRED</Word>
        <IconChip icon={journeyIcons.person} />
        <Word>MATCHED</Word>
      </Stage>

      <Stage
        index="02 / 04"
        label="INTAKE"
        caption={<>History, insurance and consent travel with the patient — <b className="font-semibold text-foreground">encrypted, verified, ready</b> before they sit down.</>}
      >
        <Word filled>VERIFIED</Word>
        <IconChip icon={journeyIcons.wifiShield} />
        <Word>SECURED</Word>
        <Word filled>ADMITTED</Word>
        <IconChip icon={journeyIcons.deviceSecurity} />
        <Word>NO&nbsp;RE-ENTRY</Word>
        <Word filled>VERIFIED</Word>
        <IconChip icon={journeyIcons.wifiShield} />
        <Word>SECURED</Word>
      </Stage>

      <Stage
        index="03 / 04"
        label="CARE"
        caption={<>Specialists, labs and pharmacy read from the <b className="font-semibold text-foreground">same live record</b>, wherever they're standing.</>}
      >
        <Word filled>COORDINATED</Word>
        <IconChip icon={journeyIcons.hospital} />
        <Word>ACROSS&nbsp;TEAMS</Word>
        <Word filled>ONE&nbsp;CHART</Word>
        <IconChip icon={journeyIcons.networkHub} />
        <Word>NOT&nbsp;SEVEN</Word>
        <Word filled>COORDINATED</Word>
        <IconChip icon={journeyIcons.hospital} />
        <Word>ACROSS&nbsp;TEAMS</Word>
      </Stage>

      <Stage
        index="04 / 04"
        label="FOLLOW-UP"
        caption={<>The record doesn't close at discharge — it keeps watching, <b className="font-semibold text-foreground">flagging gaps in care</b> before they become emergencies.</>}
      >
        <Word filled>FOLLOWED&nbsp;UP</Word>
        <IconChip icon={journeyIcons.person} />
        <Word>NOT&nbsp;FORGOTTEN</Word>
        <Word filled>OUTCOMES&nbsp;TRACKED</Word>
        <IconChip icon={journeyIcons.wifiShield} />
        <Word>CLOSED&nbsp;LOOP</Word>
        <Word filled>FOLLOWED&nbsp;UP</Word>
        <IconChip icon={journeyIcons.person} />
        <Word>NOT&nbsp;FORGOTTEN</Word>
      </Stage>
    </section>
  );
}
