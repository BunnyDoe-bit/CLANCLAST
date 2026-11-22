import { useState } from "react";
import { landingImages } from "./landingAssets";

interface Pillar {
  dotColor: string;
  title: string;
  blurb: string;
  image: { src: string; width: number; height: number; alt: string };
}

const pillars: Pillar[] = [
  {
    dotColor: "#1a7a6a",
    title: "Referral routing",
    blurb: "Matches a referral to the right provider automatically, with the full context attached.",
    image: landingImages.referralStage,
  },
  {
    dotColor: "#4861a8",
    title: "Identity & intake",
    blurb: "Verified identity and consent travel with the patient, ready before the first visit.",
    image: landingImages.intakeStage,
  },
  {
    dotColor: "#a06515",
    title: "Coordinated care",
    blurb: "Specialists, labs and pharmacy read from one live record, not seven disconnected ones.",
    image: landingImages.careStage,
  },
  {
    dotColor: "#7b55a7",
    title: "Follow-up & outcomes",
    blurb: "The record keeps watching after discharge, flagging gaps before they become emergencies.",
    image: landingImages.followUpStage,
  },
];

/**
 * Image-forward pillar cards: hover (or focus) expands a card and reveals
 * its description, similar in structure to a services showcase — original
 * layout and copy, built from ClanClast's own photography and tokens.
 */
export function ServicePillars() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="bg-background py-20" aria-labelledby="pillars-heading">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <h2 id="pillars-heading" className="max-w-xl font-display text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
            One platform, four moments that used to be four separate systems.
          </h2>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            Each stage of a patient's path through the system, handled by the same connected record.
          </p>
        </div>

        <div className="flex h-[440px] gap-3 overflow-hidden rounded-[26px]">
          {pillars.map((pillar, i) => {
            const isActive = i === activeIndex;
            return (
              <button
                key={pillar.title}
                onClick={() => setActiveIndex(i)}
                onFocus={() => setActiveIndex(i)}
                className="group relative h-full overflow-hidden rounded-[22px] text-left transition-[flex-grow] duration-500 ease-in-out focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                style={{ flexGrow: isActive ? 3 : 1, flexBasis: 0, minWidth: isActive ? undefined : 64 }}
              >
                <img
                  src={pillar.image.src}
                  width={pillar.image.width}
                  height={pillar.image.height}
                  alt={pillar.image.alt}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />
                <div className="relative flex h-full flex-col justify-end p-6 text-white">
                  <span className="mb-3 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pillar.dotColor }} />
                  <h3 className="font-display text-lg font-bold leading-snug sm:text-xl">{pillar.title}</h3>
                  <p
                    className="mt-2 max-w-[32ch] text-sm leading-6 text-white/85 transition-all duration-400"
                    style={{
                      opacity: isActive ? 1 : 0,
                      maxHeight: isActive ? 100 : 0,
                      overflow: "hidden",
                    }}
                  >
                    {pillar.blurb}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
