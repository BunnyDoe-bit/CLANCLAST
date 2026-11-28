import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/**
 * The demo section: Thandi's day recorded on the real products (provider workspace on the
 * real matching engine and database; patient app and provider app sharing one store), plus a
 * "try it live" chapter that runs both apps in this browser. The recordings work offline,
 * so the deck never depends on the venue's network.
 */

export const DeckCtx = createContext<{ active: boolean; print: boolean }>({ active: false, print: false });

export const CHAPTERS = [
  { n: "01", title: "Three files → one Thandi", sub: "Riverside’s register · the real matching engine · a person confirms", src: "/pitch/video/c1-reconcile.mp4", poster: "/pitch/video/c1-reconcile.jpg" },
  { n: "02", title: "She decides", sub: "The request lands on her phone · allowed for 7 days · logged both sides", src: "/pitch/video/c2-consent.mp4", poster: "/pitch/video/c2-consent.jpg" },
  { n: "03", title: "Trust, even offline", sub: "A signed summary she carries · verified with the network down", src: "/pitch/video/c3-trust.mp4", poster: "/pitch/video/c3-trust.jpg" },
  { n: "04", title: "Try it yourself", sub: "Both apps, live in this browser, on fictional data", src: "", poster: "" },
] as const;

type Ctl = { next: () => boolean; prev: () => boolean; toggle: () => void };
declare global { interface Window { __pitchDemo?: Ctl } }

const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("clanclast-pitch-demo") : null;

export function DemoPlayer() {
  const { active, print } = useContext(DeckCtx);
  const [ch, setCh] = useState(0);
  const [rate, setRate] = useState(2);
  const [playing, setPlaying] = useState(true);
  const [prog, setProg] = useState(0);
  const vid = useRef<HTMLVideoElement>(null);

  const go = useCallback((n: number, echo = true) => {
    setCh(n); setProg(0); setPlaying(true);
    if (echo) bc?.postMessage({ ch: n });
  }, []);
  useEffect(() => { if (!bc) return; const on = (e: MessageEvent) => go(e.data.ch, false); bc.addEventListener("message", on); return () => bc.removeEventListener("message", on); }, [go]);

  // Keyboard control from the deck while this slide is showing.
  useEffect(() => {
    if (!active) return;
    window.__pitchDemo = {
      next: () => { if (ch < CHAPTERS.length - 1) { go(ch + 1); return true; } return false; },
      prev: () => { if (ch > 0) { go(ch - 1); return true; } return false; },
      toggle: () => { const v = vid.current; if (!v) return; if (v.paused) { v.play().catch(() => {}); setPlaying(true); } else { v.pause(); setPlaying(false); } },
    };
    return () => { delete window.__pitchDemo; };
  }, [active, ch, go]);

  // Play only while the slide is on screen.
  useEffect(() => {
    const v = vid.current; if (!v) return;
    v.playbackRate = rate;
    if (active && playing) v.play().catch(() => {}); else v.pause();
  }, [active, playing, ch, rate]);
  useEffect(() => { if (!active) { setPlaying(true); } }, [active]);

  const c = CHAPTERS[ch];
  const live = !c.src;

  if (print) {
    return (
      <div className="wrap demo">
        <div className="demo-head"><div><span className="eyebrow">Live product · working prototype</span><h2>Not a mockup. <em>Thandi’s day, on the real product.</em></h2></div></div>
        <div className="demo-print">
          {CHAPTERS.slice(0, 3).map((x) => (
            <figure key={x.n}><img src={x.poster} alt="" /><figcaption><b>{x.n} · {x.title}</b>{x.sub}</figcaption></figure>
          ))}
        </div>
        <p className="live-note">Recorded on the working prototype with fictional people. Open /pitch online and choose “Try it yourself” to use both apps live.</p>
      </div>
    );
  }

  return (
    <div className="wrap demo">
      <div className="demo-head">
        <div>
          <span className="eyebrow">Live product · working prototype</span>
          <h2>Not a mockup. <em>Thandi’s day, on the real product.</em></h2>
        </div>
        <div className="live-modes" role="tablist" aria-label="Playback">
          {[1, 1.5, 2].map((r) => (
            <button key={r} role="tab" aria-selected={rate === r} className={rate === r && !live ? "on" : ""} onClick={() => setRate(r)} disabled={live}>{r}×</button>
          ))}
        </div>
      </div>
      <div className="demo-body">
        <ol className="chapters">
          {CHAPTERS.map((x, i) => (
            <li key={x.n}>
              <button className={i === ch ? "on" : i < ch ? "done" : ""} onClick={() => go(i)}>
                <span className="n">{x.n}</span>
                <span className="t"><b>{x.title}</b><small>{x.sub}</small></span>
                {x.src && <span className="bar"><i style={{ transform: `scaleX(${i < ch ? 1 : i === ch ? prog : 0})` }} /></span>}
              </button>
            </li>
          ))}
          <li className="demo-hint">→ next chapter · Space pause · click the video to pause</li>
        </ol>
        <div className="screen-box">
          {live ? <LiveApps /> : (
            <video
              key={c.src} ref={vid} src={c.src} poster={c.poster} muted playsInline preload="auto"
              onClick={() => window.__pitchDemo?.toggle()}
              onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setProg(v.currentTime / v.duration); }}
              onEnded={() => { setProg(1); setTimeout(() => go(Math.min(ch + 1, CHAPTERS.length - 2)), ch < CHAPTERS.length - 2 ? 900 : 0); }}
            />
          )}
          {!live && !playing && <button className="paused" onClick={() => window.__pitchDemo?.toggle()} aria-label="Play">▶</button>}
        </div>
      </div>
      {/* warm the next recordings so chapter changes are instant */}
      <div hidden>{CHAPTERS.filter((x) => x.src && x !== c).map((x) => <link key={x.src} rel="preload" as="video" href={x.src} />)}</div>
    </div>
  );
}

/** Chapter 4: the real apps, running here on the site's in-browser demo data. */
function LiveApps() {
  const [n, setN] = useState(0);
  return (
    <div className="live-apps">
      <figure className="la-laptop">
        <div className="laptop-screen">
          <div className="browser-bar"><span className="dots"><i /><i /><i /></span><span className="url">clanclast.health/provider</span><button onClick={() => setN((x) => x + 1)} aria-label="Reload">↻</button></div>
          <div className="la-vp"><iframe key={`p${n}`} title="CLANCLAST provider workspace, live" src="/provider/patients?embed=1" width={1320} height={800} /></div>
        </div>
        <div className="laptop-base" />
      </figure>
      <figure className="la-phone">
        <div className="phone-body"><div className="phone-notch" /><div className="la-pvp"><iframe key={`t${n}`} title="CLANCLAST patient app, live" src="/patient?embed=1" width={390} height={844} /></div></div>
      </figure>
      <p className="la-note">Live: request access in the workspace, then allow it on the phone. Needs this site to be open online. Data stays in this browser.</p>
    </div>
  );
}

/** The pitch's demo: one 33-second clip at normal speed. Click to pause. */
export function DemoClip() {
  const { active, print } = useContext(DeckCtx);
  const vid = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const v = vid.current; if (!v) return;
    if (active) { v.currentTime = 0; v.play().catch(() => {}); setPaused(false); } else v.pause();
  }, [active]);
  useEffect(() => {
    if (!active) return;
    window.__pitchDemo = { next: () => false, prev: () => false, toggle: () => { const v = vid.current; if (!v) return; if (v.paused) { v.play().catch(() => {}); setPaused(false); } else { v.pause(); setPaused(true); } } };
    return () => { delete window.__pitchDemo; };
  }, [active]);
  if (print) return <img className="clip" src="/pitch/video/demo.jpg" alt="Thandi's three records reconciled, her consent and an offline verification, in the working product" />;
  return (
    <div className="clip-box">
      <video ref={vid} className="clip" src="/pitch/video/demo.mp4" poster="/pitch/video/demo.jpg" muted playsInline preload="auto" onClick={() => window.__pitchDemo?.toggle()} />
      {paused && <button className="paused" onClick={() => window.__pitchDemo?.toggle()} aria-label="Play">▶</button>}
    </div>
  );
}
