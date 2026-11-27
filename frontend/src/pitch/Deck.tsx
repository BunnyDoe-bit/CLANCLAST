import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SLIDES, type Slide } from "./slides";
import { DemoStill } from "./DemoReel";

/**
 * The deck: 16:9 slides drawn at 1600×900 and scaled to any screen.
 *   → / Space / PageDown / click   next          ← / PageUp   previous
 *   F   full screen        P   presenter view (notes, next slide, timer) in a second window
 *   B   backup slides for questions        Home / End   first / last
 * Presenter and audience windows stay in step through BroadcastChannel.
 * ?print renders every slide one per page, for the PDF.
 */
const W = 1600, H = 900;
const MAIN = SLIDES.filter((s) => !s.backup);
const TOTAL = MAIN.reduce((n, s) => n + s.seconds, 0);
const fromHash = () => { const n = parseInt(window.location.hash.slice(1), 10); return Number.isFinite(n) && n >= 1 && n <= SLIDES.length ? n - 1 : 0; };
const fmt = (s: number) => `${s < 0 ? "−" : ""}${Math.floor(Math.abs(s) / 60)}:${String(Math.floor(Math.abs(s) % 60)).padStart(2, "0")}`;

type Msg = { type: "go"; i: number } | { type: "timer"; startedAt: number | null };

function useChannel(onMsg: (m: Msg) => void) {
  const ref = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel("clanclast-pitch");
    ch.onmessage = (e) => onMsg(e.data as Msg);
    ref.current = ch;
    return () => ch.close();
  }, [onMsg]);
  return useCallback((m: Msg) => ref.current?.postMessage(m), []);
}

/** A slide at its natural size, scaled to fit the box it's in. */
function Stage({ slide, fit = "window", print = false }: { slide: Slide; fit?: "window" | "box"; print?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    if (print) return;
    const el = fit === "window" ? document.documentElement : box.current;
    if (!el) return;
    const on = () => {
      const w = fit === "window" ? window.innerWidth : el.clientWidth, h = fit === "window" ? window.innerHeight : el.clientHeight;
      setScale(Math.min(w / W, h / H));
    };
    on();
    const ro = new ResizeObserver(on);
    ro.observe(fit === "window" ? document.body : el);
    window.addEventListener("resize", on);
    return () => { ro.disconnect(); window.removeEventListener("resize", on); };
  }, [fit, print]);
  const body = print && slide.id === "demo" ? <DemoStill /> : slide.body;
  return (
    <div ref={box} className={`stage-box ${fit}`}>
      <section className={`slide ${slide.tone} slide-${slide.id}`} style={print ? undefined : { width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})` }} aria-roledescription="slide" aria-label={slide.title}>
        {body}
      </section>
    </div>
  );
}

export function Deck() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("print")) return <Print />;
  if (params.has("presenter")) return <Presenter />;
  return <Audience />;
}

function Audience() {
  const [i, setI] = useState(fromHash);
  const [hint, setHint] = useState(true);
  const send = useChannel(useCallback((m: Msg) => { if (m.type === "go") setI(m.i); }, []));
  const go = useCallback((n: number) => {
    setI((cur) => {
      const next = Math.max(0, Math.min(SLIDES.length - 1, n));
      if (next !== cur) { send({ type: "go", i: next }); history.replaceState(null, "", `#${next + 1}`); }
      return next;
    });
  }, [send]);

  useEffect(() => { const t = setTimeout(() => setHint(false), 4500); return () => clearTimeout(t); }, []);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (["ArrowRight", "PageDown", " ", "Enter"].includes(k)) { e.preventDefault(); go(i + 1); }
      else if (["ArrowLeft", "PageUp", "Backspace"].includes(k)) { e.preventDefault(); go(i - 1); }
      else if (k === "Home") go(0);
      else if (k === "End") go(MAIN.length - 1);
      else if (k === "b" || k === "B") go(i >= MAIN.length ? MAIN.length - 1 : MAIN.length);
      else if (k === "f" || k === "F") { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); }
      else if (k === "p" || k === "P") window.open(`${window.location.pathname}?presenter#${i + 1}`, "clanclast-presenter", "width=1280,height=800");
      else if (k === "?") setHint((h) => !h);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [i, go]);

  const slide = SLIDES[i];
  return (
    <div className="deck" onClick={(e) => { if ((e.target as HTMLElement).closest("button, a")) return; go(e.clientX < window.innerWidth / 3 ? i - 1 : i + 1); }}>
      <Stage slide={slide} />
      <div className="progress" aria-hidden="true"><i style={{ width: `${(Math.min(i + 1, MAIN.length) / MAIN.length) * 100}%` }} /></div>
      <div className="count" aria-live="polite">{slide.backup ? "Backup" : `${i + 1} / ${MAIN.length}`}</div>
      <div className={`hint ${hint ? "on" : ""}`}>→ next · ← back · F full screen · P presenter view · B questions</div>
    </div>
  );
}

function Presenter() {
  const [i, setI] = useState(fromHash);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [slideAt, setSlideAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const send = useChannel(useCallback((m: Msg) => {
    if (m.type === "go") { setI(m.i); setSlideAt(Date.now()); }
    if (m.type === "timer") setStartedAt(m.startedAt);
  }, []));
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  const go = useCallback((n: number) => {
    const next = Math.max(0, Math.min(SLIDES.length - 1, n));
    setI(next); setSlideAt(Date.now()); send({ type: "go", i: next });
    setStartedAt((s) => s ?? Date.now());
  }, [send]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (["ArrowRight", "PageDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); go(i + 1); }
      else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); go(i - 1); }
      else if (e.key === "t" || e.key === "T") { const v = startedAt ? null : Date.now(); setStartedAt(v); send({ type: "timer", startedAt: v }); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [i, go, startedAt, send]);

  const slide = SLIDES[i], next = SLIDES[i + 1];
  const elapsed = startedAt ? (now - startedAt) / 1000 : 0;
  const onSlide = (now - slideAt) / 1000;
  const plannedBefore = MAIN.slice(0, Math.min(i, MAIN.length)).reduce((n, s) => n + s.seconds, 0);
  const behind = startedAt ? elapsed - plannedBefore : 0;
  return (
    <div className="presenter">
      <header>
        <div className={`clock ${TOTAL - elapsed < 30 ? "late" : ""}`}><span>Remaining</span><strong>{fmt(TOTAL - elapsed)}</strong></div>
        <div className="clock"><span>This slide</span><strong className={slide.seconds && onSlide > slide.seconds ? "late" : ""}>{fmt(onSlide)}</strong><em>target {fmt(slide.seconds)}</em></div>
        <div className="clock"><span>Pace</span><strong className={behind > 10 ? "late" : ""}>{startedAt ? (behind > 10 ? `${Math.round(behind)} s behind` : "on time") : "press T or → to start"}</strong></div>
        <div className="nav"><button onClick={() => go(i - 1)}>←</button><span>{slide.backup ? "Backup" : `${i + 1} / ${MAIN.length}`}</span><button onClick={() => go(i + 1)}>→</button></div>
      </header>
      <main>
        <div className="now"><Stage slide={slide} fit="box" /></div>
        <aside>
          <p className="next-label">Next: {next ? next.title : "End"}</p>
          <div className="next">{next && <Stage slide={next} fit="box" />}</div>
          <div className="notes"><h3>{slide.title}</h3><p>{slide.notes}</p></div>
        </aside>
      </main>
    </div>
  );
}

function Print() {
  useEffect(() => { document.documentElement.classList.add("printing"); }, []);
  const slides = useMemo(() => SLIDES, []);
  return <div className="print">{slides.map((s) => <Stage key={s.id} slide={s} print />)}</div>;
}
