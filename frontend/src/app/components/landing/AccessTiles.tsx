import React, { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  ChevronRight,
  HeartPulse,
  LockKeyhole,
  MapPin,
  QrCode,
  ShieldCheck,
  Stethoscope,
  Wifi,
} from "lucide-react";
import type { ReactNode } from "react";

export type LandingContext =
  | "landing"
  | "patient"
  | "provider"
  | "connect"
  | "verify"
  | "onboard"
  | "ussd"
  | "caregiver";

type Tile = {
  title: string;
  eyebrow: string;
  description: string;
  icon: ReactNode;
  context: LandingContext;
};

const tiles: Tile[] = [
  {
    title: "CLANCLAST Health",
    eyebrow: "FOR PATIENTS",
    description:
      "Your health identity, records, emergency information and care journey — securely connected in one place.",
    icon: <HeartPulse size={18} strokeWidth={2} />,
    context: "patient",
  },
  {
    title: "CLANCLAST Provider",
    eyebrow: "FOR PROVIDERS",
    description:
      "Give healthcare providers trusted access to the information they need, when they need it.",
    icon: <Stethoscope size={18} strokeWidth={2} />,
    context: "provider",
  },
  {
    title: "CLANCLAST Connect",
    eyebrow: "FOR SYSTEMS",
    description:
      "Connect fragmented healthcare systems, organisations and data into one interoperable health infrastructure.",
    icon: <Wifi size={18} strokeWidth={2} />,
    context: "connect",
  },
  {
    title: "CLANCLAST Verify",
    eyebrow: "FOR TRUST",
    description:
      "Verify identities, credentials, healthcare organisations and records before information is trusted.",
    icon: <BadgeCheck size={18} strokeWidth={2} />,
    context: "verify",
  },
];

const experienceUrls: Partial<Record<LandingContext, string>> = {
  patient: "https://clanclast-patient-health.vercel.app/",
  provider: "https://clanclast-provider.vercel.app/",
};

const themes = [
  {
    bg: "bg-[#f5f8f6]",
    accent: "text-[#176247]",
    button: "bg-[#176247] text-white hover:bg-[#0f4431]",
  },
  {
    bg: "bg-[#176247]",
    accent: "text-white",
    button: "bg-white text-[#176247] hover:bg-zinc-100",
  },
  {
    bg: "bg-[#176247]",
    accent: "text-white",
    button: "bg-white text-[#176247] hover:bg-zinc-100",
  },
  {
    bg: "bg-[#176247]",
    accent: "text-white",
    button: "bg-white text-[#176247] hover:bg-zinc-100",
  },
];

export function AccessTiles({
  setContext,
}: {
  setContext: (c: LandingContext) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const light = activeIndex === 0;
  const activeTile = tiles[activeIndex];
  const activeTheme = themes[activeIndex];
  const nextIndex = (activeIndex + 1) % tiles.length;
  const nextTile = tiles[nextIndex];

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x: x * 7, y: y * -7 });
  };

  const handleMouseLeave = () => setMousePos({ x: 0, y: 0 });

  const selectExperience = (index: number) => {
    setActiveIndex(index);
    setMousePos({ x: 0, y: 0 });
  };

  const handleNext = () => selectExperience(nextIndex);

  const handleExplore = () => {
  const destination = experienceUrls[activeTile.context];

  if (destination) {
    window.location.href = destination;
    return;
  }

  setContext(activeTile.context);
};

  return (
    <section
      className={`relative w-full overflow-hidden px-6 py-8 transition-colors duration-700 sm:px-10 lg:px-16 ${activeTheme.bg}`}
      aria-labelledby="access-tiles-heading"
    >
      {/* BACKGROUND ATMOSPHERE */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full blur-3xl transition-all duration-700 ${
            light ? "bg-[#176247]/5" : "bg-white/5"
          }`}
        />
        <div
          className={`absolute -bottom-60 -left-40 h-[500px] w-[500px] rounded-full blur-3xl transition-all duration-700 ${
            light ? "bg-[#176247]/5" : "bg-black/10"
          }`}
        />
        <div
          className={`absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-all duration-700 ${
            light ? "bg-[#176247]/[0.025]" : "bg-white/[0.025]"
          }`}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* SECTION INTRO */}
        <div className="flex items-center justify-between border-b border-current/10 pb-5">
          <div
            className={`flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.25em] ${
              light ? "text-zinc-400" : "text-white/45"
            }`}
          >
            <span className="h-px w-8 bg-current" />
            The CLANCLAST ecosystem
          </div>
          <div
            className={`hidden text-[9px] font-black uppercase tracking-[0.2em] sm:block ${
              light ? "text-zinc-300" : "text-white/30"
            }`}
          >
            01 — 04
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="grid items-center gap-10 py-14 lg:grid-cols-[0.82fr_1.18fr] lg:py-20">
          {/* LEFT CONTENT */}
          <div className="relative z-20 max-w-xl">
            <div
              className={`mb-6 flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.25em] transition-colors duration-500 ${activeTheme.accent}`}
            >
              <span className="h-px w-8 bg-current" />
              {activeTile.eyebrow}
            </div>

            <h2
              id="access-tiles-heading"
              className={`text-5xl font-black leading-[0.94] tracking-[-0.055em] transition-colors duration-500 sm:text-6xl lg:text-[4.7rem] ${
                light ? "text-zinc-950" : "text-white"
              }`}
            >
              YOUR HEALTH.
              <br />
              <span
                className={`font-serif font-normal italic tracking-[-0.04em] ${
                  light
                    ? "bg-gradient-to-r from-zinc-950 via-zinc-700 to-zinc-950 bg-clip-text text-transparent"
                    : "text-white"
                }`}
              >
                connected.
              </span>
            </h2>

            <p
              className={`mt-7 max-w-md text-[15px] font-medium leading-7 transition-colors duration-500 ${
                light ? "text-zinc-600" : "text-white/75"
              }`}
            >
              {activeTile.description}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleExplore}
                className={`group inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-xs font-black shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${activeTheme.button}`}
              >
                Explore {activeTile.title.replace("CLANCLAST ", "")}
                <ArrowRight
                  size={15}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </button>

              {/* NEXT TILE */}
              <button
                type="button"
                onClick={handleNext}
                aria-label={`Show next: ${nextTile.title}`}
                className={`group inline-flex items-center gap-3 rounded-full border px-6 py-3.5 text-xs font-black transition-all duration-300 hover:-translate-y-1 ${
                  light
                    ? "border-zinc-300 text-zinc-800 hover:border-[#176247] hover:text-[#176247]"
                    : "border-white/35 text-white hover:border-white hover:bg-white/10"
                }`}
              >
                Next: {nextTile.title.replace("CLANCLAST ", "")}
                <ArrowRight
                  size={15}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </button>
            </div>

            <div
              className={`mt-6 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] ${
                light ? "text-zinc-400" : "text-white/45"
              }`}
            >
              <LockKeyhole size={11} />
              Built around trust
            </div>
          </div>

          {/* 3D PRODUCT STAGE */}
          <div
            className="relative min-h-[560px]"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Slides in from the right every time the tile changes */}
            <div
              key={activeIndex}
              className="animate-in fade-in slide-in-from-right-16 duration-700 motion-reduce:animate-none"
              style={{ perspective: "1400px" }}
            >
              <div
                className="relative flex min-h-[560px] items-center justify-center transition-transform duration-300 ease-out"
                style={{
                  transform: `rotateX(${mousePos.y}deg) rotateY(${mousePos.x}deg)`,
                  transformStyle: "preserve-3d",
                }}
              >
                {/* PATIENT / IPHONE */}
                {activeIndex === 0 && (
                  <>
                    {/* FLOATING HEALTH CARD */}
                    <div
                      className="absolute right-[2%] top-[8%] z-20 hidden w-52 rotate-[7deg] rounded-3xl border border-white/70 bg-white/75 p-4 shadow-[0_30px_70px_rgba(0,0,0,0.12)] backdrop-blur-xl sm:block"
                      style={{ transform: "translateZ(20px)" }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[7px] font-black uppercase tracking-[0.18em] text-zinc-400">EMERGENCY</div>
                          <div className="mt-1 text-xs font-black text-zinc-900">Health Summary</div>
                        </div>
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#176247]/10 text-[#176247]">
                          <HeartPulse size={13} />
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="h-1.5 w-full rounded-full bg-zinc-100" />
                        <div className="h-1.5 w-3/4 rounded-full bg-zinc-100" />
                        <div className="h-1.5 w-1/2 rounded-full bg-zinc-100" />
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-[7px] font-bold text-[#176247]">
                        <BadgeCheck size={10} />
                        Verified information
                      </div>
                    </div>

                    {/* PHONE SHADOW */}
                    <div className="absolute bottom-[3%] left-1/2 h-20 w-64 -translate-x-1/2 rounded-full bg-black/25 blur-2xl" />

                    {/* IPHONE */}
                    <div
                      className="relative z-10 h-[535px] w-[270px] rounded-[43px] border-[5px] border-[#242424] bg-[#151515] p-[5px] shadow-[20px_40px_80px_rgba(0,0,0,0.25)]"
                      style={{
                        transform: "translateZ(60px) rotateY(-3deg) rotateX(1deg)",
                        transformStyle: "preserve-3d",
                      }}
                    >
                      <div className="pointer-events-none absolute inset-0 rounded-[38px] border border-white/20" />
                      <div className="absolute -left-[7px] top-24 h-8 w-[3px] rounded-l-full bg-[#3d3d3d]" />
                      <div className="absolute -left-[7px] top-36 h-14 w-[3px] rounded-l-full bg-[#3d3d3d]" />
                      <div className="absolute -right-[7px] top-32 h-16 w-[3px] rounded-r-full bg-[#3d3d3d]" />

                      {/* SCREEN */}
                      <div className="relative h-full w-full overflow-hidden rounded-[36px] bg-[#f7faf8]">
                        <div className="absolute inset-0 bg-gradient-to-b from-[#eaf4ee] via-white to-[#f7faf8]" />

                        <div className="absolute left-1/2 top-3 z-30 h-[25px] w-[92px] -translate-x-1/2 rounded-full bg-black shadow-md">
                          <div className="absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-zinc-800" />
                        </div>

                        <div className="relative z-20 flex items-center justify-between px-7 pt-3 text-[8px] font-bold text-zinc-800">
                          <span>9:41</span>
                          <div className="flex items-center gap-1.5">
                            <Wifi size={9} />
                            <div className="h-2.5 w-5 rounded-[3px] border border-zinc-800 p-[1px]">
                              <div className="h-full w-full rounded-[1px] bg-zinc-800" />
                            </div>
                          </div>
                        </div>

                        <div className="relative z-10 px-5 pt-7">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-[7px] font-black tracking-[0.18em] text-[#176247]">CLANCLAST HEALTH</div>
                              <div className="mt-1 text-[17px] font-black tracking-tight text-zinc-950">Good morning</div>
                            </div>
                            <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm">
                              <Bell size={14} className="text-zinc-700" />
                              <div className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#176247]" />
                            </div>
                          </div>
                        </div>

                        {/* PASSPORT */}
                        <div className="relative z-10 mx-5 mt-5 overflow-hidden rounded-[22px] bg-[#176247] p-5 text-white shadow-[0_18px_35px_rgba(23,98,71,0.28)]">
                          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full border border-white/10" />
                          <div className="relative flex items-start justify-between">
                            <div>
                              <div className="text-[7px] font-black uppercase tracking-[0.2em] text-white/55">HEALTH PASSPORT</div>
                              <div className="mt-2 text-4xl font-black tracking-tight">87</div>
                              <div className="mt-1 text-[8px] text-white/60">Passport score</div>
                            </div>
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10">
                              <BadgeCheck size={17} />
                            </div>
                          </div>
                          <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-white/15">
                            <div className="h-full w-[87%] rounded-full bg-white" />
                          </div>
                          <div className="relative mt-4 flex justify-between">
                            <span className="text-[7px] font-bold uppercase tracking-widest text-white/50">Identity verified</span>
                            <span className="text-[7px] font-black text-white">87%</span>
                          </div>
                        </div>

                        {/* QUICK ACCESS */}
                        <div className="relative z-10 mt-5 px-5">
                          <div className="mb-2 text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400">Quick access</div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { icon: <QrCode size={15} />, label: "Emergency" },
                              { icon: <HeartPulse size={15} />, label: "Records" },
                              { icon: <Stethoscope size={15} />, label: "Care team" },
                            ].map((item) => (
                              <div key={item.label} className="rounded-2xl border border-zinc-100 bg-white p-3 text-center shadow-sm">
                                <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-xl bg-[#176247]/10 text-[#176247]">
                                  {item.icon}
                                </div>
                                <div className="mt-2 text-[7px] font-bold text-zinc-500">{item.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* RECENT ACTIVITY */}
                        <div className="relative z-10 mx-5 mt-5 rounded-2xl border border-zinc-100 bg-white p-3.5 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="text-[8px] font-black uppercase tracking-wider text-zinc-400">Recent activity</div>
                            <ChevronRight size={12} className="text-zinc-300" />
                          </div>
                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#176247]/10 text-[#176247]">
                              <BadgeCheck size={14} />
                            </div>
                            <div>
                              <div className="text-[9px] font-black text-zinc-800">Record verified</div>
                              <div className="mt-0.5 text-[7px] text-zinc-400">Today · 08:42</div>
                            </div>
                          </div>
                        </div>

                        <div className="absolute bottom-2 left-1/2 z-30 h-1 w-24 -translate-x-1/2 rounded-full bg-zinc-900/80" />
                      </div>
                    </div>

                    {/* TRUST CARD */}
                    <div
                      className="absolute bottom-[12%] right-[1%] z-20 rounded-2xl border border-white/70 bg-white/90 p-3 shadow-[0_20px_40px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:right-[4%]"
                      style={{ transform: "translateZ(110px) rotate(-4deg)" }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#176247] text-white">
                          <ShieldCheck size={15} />
                        </div>
                        <div>
                          <div className="text-[8px] font-black text-zinc-900">Trusted identity</div>
                          <div className="mt-0.5 text-[7px] text-zinc-400">CLANCLAST Network</div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* PROVIDER */}
                {activeIndex === 1 && (
                  <div className="relative w-full max-w-[600px]" style={{ transform: "translateZ(45px)" }}>
                    <div className="absolute -bottom-10 left-10 right-10 h-20 rounded-full bg-black/25 blur-3xl" />
                    <div className="relative overflow-hidden rounded-[28px] border border-white/20 bg-[#151a18] p-2 shadow-[0_35px_80px_rgba(0,0,0,0.28)]">
                      <div className="overflow-hidden rounded-[21px] bg-[#f6f8f7]">
                        <div className="flex h-12 items-center justify-between border-b border-zinc-200 bg-white px-5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#176247] text-white">
                              <HeartPulse size={12} />
                            </div>
                            <div>
                              <div className="text-[9px] font-black tracking-tight text-zinc-900">CLANCLAST</div>
                              <div className="text-[5px] font-bold tracking-[0.25em] text-[#176247]">HEALTH</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Bell size={14} className="text-zinc-400" />
                            <div className="h-6 w-6 rounded-full bg-zinc-200" />
                          </div>
                        </div>

                        <div className="grid min-h-[410px] grid-cols-[145px_1fr]">
                          <div className="border-r border-zinc-200 bg-white p-4">
                            <div className="text-[7px] font-black uppercase tracking-widest text-zinc-400">WORKSPACE</div>
                            <div className="mt-4 space-y-1.5">
                              {["Overview", "Patients", "Records", "Verification", "Care team"].map((item, index) => (
                                <div
                                  key={item}
                                  className={`rounded-lg px-3 py-2 text-[8px] font-bold ${
                                    index === 1 ? "bg-[#176247]/10 text-[#176247]" : "text-zinc-400"
                                  }`}
                                >
                                  {item}
                                </div>
                              ))}
                            </div>
                            <div className="mt-20 rounded-xl bg-[#176247] p-3 text-white">
                              <ShieldCheck size={15} />
                              <div className="mt-2 text-[8px] font-black">Trusted Provider</div>
                              <div className="mt-1 text-[7px] text-white/60">Level 3 verification</div>
                            </div>
                          </div>

                          <div className="p-5">
                            <div className="flex items-end justify-between">
                              <div>
                                <div className="text-[8px] font-black uppercase tracking-widest text-[#176247]">PATIENTS</div>
                                <div className="mt-1 text-xl font-black tracking-tight text-zinc-900">Today&apos;s care</div>
                              </div>
                              <div className="rounded-full bg-[#176247] px-3 py-1.5 text-[7px] font-black text-white">42 patients</div>
                            </div>

                            <div className="mt-5 grid grid-cols-3 gap-2">
                              {[
                                ["42", "Patients"],
                                ["96%", "Verified"],
                                ["08", "Pending"],
                              ].map(([value, label]) => (
                                <div key={label} className="rounded-xl border border-zinc-100 bg-white p-3 shadow-sm">
                                  <div className="text-lg font-black text-zinc-900">{value}</div>
                                  <div className="mt-1 text-[7px] font-bold uppercase tracking-wider text-zinc-400">{label}</div>
                                </div>
                              ))}
                            </div>

                            <div className="mt-4 rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-[7px] font-black uppercase tracking-widest text-zinc-400">SELECTED PATIENT</div>
                                  <div className="mt-1 text-sm font-black text-zinc-900">Health Passport</div>
                                </div>
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#176247]/10 text-[#176247]">
                                  <BadgeCheck size={15} />
                                </div>
                              </div>
                              <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#f5f8f6] p-3">
                                <div className="h-9 w-9 rounded-full bg-zinc-200" />
                                <div className="flex-1">
                                  <div className="text-[9px] font-black text-zinc-800">Identity verified</div>
                                  <div className="mt-0.5 text-[7px] text-zinc-400">12 health records available</div>
                                </div>
                                <ChevronRight size={13} className="text-zinc-300" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CONNECT */}
                {activeIndex === 2 && (
                  <div className="relative w-full max-w-[650px]" style={{ transform: "translateZ(50px)" }}>
                    <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />

                    <div className="relative grid items-center gap-5 sm:grid-cols-[1fr_120px_1fr]">
                      <div className="space-y-3">
                        <div className="mb-5 text-[8px] font-black uppercase tracking-[0.22em] text-white/45">Fragmented systems</div>
                        {[
                          ["Hospital System", "Patient records"],
                          ["Clinic Network", "Clinical data"],
                          ["Laboratory", "Results & reports"],
                        ].map(([name, sub]) => (
                          <div
                            key={name}
                            className="relative rounded-2xl border border-white/10 bg-white/[0.07] p-4 shadow-[0_15px_30px_rgba(0,0,0,0.1)] backdrop-blur-md"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                                <div className="h-2.5 w-2.5 rounded-full bg-white/40" />
                              </div>
                              <div>
                                <div className="text-[9px] font-black text-white/85">{name}</div>
                                <div className="mt-1 text-[7px] text-white/35">{sub}</div>
                              </div>
                            </div>
                            <div className="absolute -right-5 top-1/2 h-px w-5 bg-gradient-to-r from-white/10 to-white/50" />
                          </div>
                        ))}
                      </div>

                      <div className="relative flex items-center justify-center py-8">
                        <div className="absolute h-40 w-40 rounded-full border border-white/5" />
                        <div className="absolute h-28 w-28 rounded-full border border-white/10" />
                        <div
                          className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/20 bg-white text-[#176247] shadow-[0_25px_60px_rgba(0,0,0,0.3)]"
                          style={{ transform: "translateZ(50px) rotate(-2deg)" }}
                        >
                          <HeartPulse size={27} />
                          <div className="absolute -bottom-7 rounded-full bg-[#0f4431] px-3 py-1.5 text-[7px] font-black tracking-[0.18em] text-white shadow-lg">
                            CLANCLAST
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="mb-5 text-right text-[8px] font-black uppercase tracking-[0.22em] text-white/45">Connected infrastructure</div>
                        {[
                          ["Verified Identity", <BadgeCheck size={14} />],
                          ["Trusted Records", <ShieldCheck size={14} />],
                          ["Connected Care", <HeartPulse size={14} />],
                        ].map(([name, icon]) => (
                          <div
                            key={String(name)}
                            className="relative rounded-2xl border border-white/10 bg-white p-4 shadow-[0_15px_30px_rgba(0,0,0,0.15)]"
                          >
                            <div className="absolute -left-5 top-1/2 h-px w-5 bg-gradient-to-l from-white/10 to-white/50" />
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#176247]/10 text-[#176247]">
                                {icon}
                              </div>
                              <div className="text-[9px] font-black text-zinc-900">{name}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mx-auto mt-12 max-w-sm rounded-2xl border border-white/10 bg-black/10 p-4 text-center backdrop-blur-md">
                      <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">CLANCLAST CONNECT</div>
                      <div className="mt-2 text-xs font-bold text-white/80">
                        Turning fragmented healthcare into connected infrastructure.
                      </div>
                    </div>
                  </div>
                )}

                {/* VERIFY */}
                {activeIndex === 3 && (
                  <div className="relative w-full max-w-[550px]" style={{ transform: "translateZ(55px)" }}>
                    <div className="absolute -bottom-12 left-10 right-10 h-20 rounded-full bg-black/25 blur-3xl" />

                    <div className="relative overflow-hidden rounded-[32px] border border-white/20 bg-[#f5f8f6] p-5 shadow-[0_35px_80px_rgba(0,0,0,0.25)]">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[8px] font-black uppercase tracking-[0.22em] text-[#176247]">CLANCLAST VERIFY</div>
                          <div className="mt-1 text-xl font-black tracking-tight text-zinc-950">Credential verification</div>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#176247] text-white shadow-lg">
                          <QrCode size={18} />
                        </div>
                      </div>

                      {/* SCANNER */}
                      <div className="relative mt-6 overflow-hidden rounded-[25px] bg-zinc-950 p-8">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(23,98,71,0.35),transparent_55%)]" />
                        <div className="relative mx-auto aspect-square max-w-[190px] rounded-[28px] border border-white/10 bg-white/[0.03] p-7">
                          <div className="absolute left-4 top-4 h-7 w-7 rounded-tl-lg border-l-2 border-t-2 border-[#7ee2b5]" />
                          <div className="absolute right-4 top-4 h-7 w-7 rounded-tr-lg border-r-2 border-t-2 border-[#7ee2b5]" />
                          <div className="absolute bottom-4 left-4 h-7 w-7 rounded-bl-lg border-b-2 border-l-2 border-[#7ee2b5]" />
                          <div className="absolute bottom-4 right-4 h-7 w-7 rounded-br-lg border-b-2 border-r-2 border-[#7ee2b5]" />
                          <div className="flex h-full w-full items-center justify-center rounded-2xl bg-white">
                            <QrCode size={95} strokeWidth={1.3} className="text-zinc-900" />
                          </div>
                          <div className="absolute left-8 right-8 top-1/2 h-px bg-[#7ee2b5] shadow-[0_0_12px_rgba(126,226,181,0.8)]" />
                        </div>
                        <div className="relative mt-5 text-center">
                          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50">SCANNING CREDENTIAL</div>
                          <div className="mt-1 text-xs font-bold text-white">Verifying with CLANCLAST</div>
                        </div>
                      </div>

                      {/* RESULT */}
                      <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#176247] text-white shadow-md">
                            <BadgeCheck size={21} />
                          </div>
                          <div className="flex-1">
                            <div className="text-[10px] font-black text-zinc-900">Identity verified</div>
                            <div className="mt-1 text-[7px] text-zinc-400">Credential is authentic and issuer is trusted.</div>
                          </div>
                          <div className="rounded-full bg-[#176247]/10 px-2.5 py-1 text-[7px] font-black uppercase tracking-wider text-[#176247]">
                            Trusted
                          </div>
                        </div>
                      </div>

                      {/* TRUST SIGNALS */}
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {["Identity", "Credential", "Issuer"].map((label) => (
                          <div key={label} className="rounded-xl border border-zinc-100 bg-white p-2.5 text-center">
                            <ShieldCheck size={13} className="mx-auto text-[#176247]" />
                            <div className="mt-1 text-[7px] font-bold text-zinc-500">{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* FLOATING PROVIDER CARD */}
                    <div
                      className="absolute -left-5 bottom-[15%] hidden rounded-2xl border border-white/70 bg-white/90 p-3 shadow-xl backdrop-blur-xl sm:block"
                      style={{ transform: "translateZ(100px) rotate(-5deg)" }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#176247]/10 text-[#176247]">
                          <MapPin size={12} />
                        </div>
                        <div>
                          <div className="text-[8px] font-black text-zinc-900">Trusted provider</div>
                          <div className="text-[7px] text-zinc-400">Verified by CLANCLAST</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div
              className={`pointer-events-none absolute bottom-0 left-0 right-0 text-center text-[9px] font-bold uppercase tracking-[0.18em] ${
                light ? "text-zinc-400" : "text-white/45"
              }`}
            >
              
            </div>
          </div>
        </div>

        {/* SECTION CONTROLS */}
        <div className="flex items-center justify-between border-t border-current/10 pt-5">
          <div
            className={`text-[9px] font-black uppercase tracking-[0.2em] ${
              light ? "text-zinc-400" : "text-white/45"
            }`}
          >
            0{activeIndex + 1} / 04
          </div>

          <div className="flex items-center gap-2">
            {tiles.map((tile, index) => (
              <button
                key={tile.context}
                type="button"
                aria-label={`Show ${tile.title}`}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => selectExperience(index)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  index === activeIndex
                    ? light
                      ? "w-10 bg-[#176247]"
                      : "w-10 bg-white"
                    : light
                      ? "w-2 bg-zinc-300"
                      : "w-2 bg-white/25"
                }`}
              />
            ))}
          </div>

          <div
            className={`hidden text-[9px] font-black uppercase tracking-[0.2em] sm:block ${
              light ? "text-zinc-400" : "text-white/40"
            }`}
          >
            CLANCLAST HEALTH
          </div>
        </div>
      </div>
    </section>
  );
}

export default AccessTiles;
