import { useEffect, useState } from "react";

/**
 * The demo slide: the real apps, in a fixed sequence of real screens, so it plays the same on any
 * laptop with or without a network. The full live, clickable demo runs on our own machine after the pitch.
 */
const STEPS = [
  { t: "Front desk finds her, without a new folder", d: "“Thandi Mokoena” matches Thandiwe’s existing ID; staff confirm it’s her.", laptop: "/pitch/d2-provider-checkin.webp", phone: "/pitch/d4-patient-today.webp" },
  { t: "The clinic asks for her emergency summary", d: "Scoped, with a reason she can read.", laptop: "/pitch/d3-provider-request.webp", phone: "/pitch/d4-patient-today.webp" },
  { t: "She decides, on her own phone", d: "Who is asking, what for, and for how long. Allow or decline.", laptop: "/pitch/d3-provider-request.webp", phone: "/pitch/d5-patient-consent.webp" },
  { t: "The clinic sees her answer at once", d: "Every access is logged where she can see it.", laptop: "/pitch/d7-provider-approved.webp", phone: "/pitch/d6-patient-allowed.webp" },
  { t: "A signed summary travels with her", d: "The clinic signs; her phone checks the signature and keeps it encrypted, even offline.", laptop: "/pitch/d8-provider-handoff.webp", phone: "/pitch/d9-patient-incoming.webp" },
];
export const DEMO_STEP_MS = 10_500;

export function DemoReel({ still = false }: { still?: boolean }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(!still);
  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => setI((n) => (n + 1) % STEPS.length), DEMO_STEP_MS);
    return () => window.clearTimeout(t);
  }, [i, playing]);
  // Preload every screen so steps never flash on a slow laptop.
  useEffect(() => { STEPS.forEach((s) => { new Image().src = s.laptop; new Image().src = s.phone; }); }, []);
  const s = STEPS[i];
  return (
    <div className="s-demo">
      <div className="demo-head">
        <span className="eyebrow">Working product · real screens</span>
        <h2>From the front desk to her phone, in five steps.</h2>
      </div>
      <div className="demo-stage">
        <div className="laptop"><div className="bar"><i /><i /><i /><span>Provider workspace</span></div><img key={s.laptop} src={s.laptop} alt="CLANCLAST provider workspace" /></div>
        <div className="phone"><img key={s.phone} src={s.phone} alt="CLANCLAST patient app" /></div>
      </div>
      <ol className="demo-steps">
        {STEPS.map((x, n) => (
          <li key={x.t} className={n === i ? "on" : n < i ? "done" : ""}>
            <button onClick={(e) => { e.stopPropagation(); setI(n); setPlaying(false); }}>
              <span className="k">{n + 1}</span>
              <span><b>{x.t}</b>{n === i && <em>{x.d}</em>}</span>
            </button>
            {n === i && playing && <span className="prog" key={`p${i}`} style={{ animationDuration: `${DEMO_STEP_MS}ms` }} />}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Print / PDF version: every step at once. */
export function DemoStill() {
  return (
    <div className="s-demo still">
      <div className="demo-head">
        <span className="eyebrow">Working product · real screens</span>
        <h2>From the front desk to her phone, in five steps.</h2>
      </div>
      <div className="still-grid">
        {STEPS.map((x, n) => (
          <figure key={x.t}>
            <div className="pair"><img src={x.laptop} alt="" /><img className="ph" src={x.phone} alt="" /></div>
            <figcaption><span className="k">{n + 1}</span>{x.t}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
