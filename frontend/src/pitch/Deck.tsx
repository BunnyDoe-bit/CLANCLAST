import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { Logo } from "../app/components/shared/Brand";
import { MAIN, NAV, SLIDES, TOTAL, type Slide } from "./slides";
import { DeckCtx } from "./DemoPlayer";

/**
 * The pitch deck is the website: the site's own header, sections and styles, one section per
 * slide, moving like the page scrolls. Drawn at 1920×1080 and scaled to any screen.
 *   → / Space / PageDown   next (inside the demo: next chapter)      ← / PageUp   back
 *   F full screen · P presenter view · B questions · Home / End · nav links jump to a section
 * The presenter and audience windows stay in step through BroadcastChannel.
 * ?print renders one slide per page, for the PDF and PowerPoint export.
 */
const W = 1920, H = 1080;
const indexOf = (id: string) => Math.max(0, SLIDES.findIndex((s) => s.id === id));
const fromHash = () => { const h = window.location.hash.slice(1); const n = parseInt(h, 10); if (Number.isFinite(n) && n >= 1 && n <= SLIDES.length) return n - 1; const i = SLIDES.findIndex((s) => s.id === h); return i >= 0 ? i : 0; };
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

function useScale(fit: "window" | "box", box: React.RefObject<HTMLElement | null>) {
  const [s, setS] = useState(0.5);
  useLayoutEffect(() => {
    const on = () => {
      const el = box.current;
      const w = fit === "window" ? window.innerWidth : el?.clientWidth ?? 0, h = fit === "window" ? window.innerHeight : el?.clientHeight ?? 0;
      if (w && h) setS(Math.min(w / W, h / H));
    };
    on();
    const ro = new ResizeObserver(on);
    if (box.current) ro.observe(box.current);
    window.addEventListener("resize", on);
    return () => { ro.disconnect(); window.removeEventListener("resize", on); };
  }, [fit, box]);
  return s;
}

/** The site's header, with the deck's sections as its links. */
function Header({ slide, go }: { slide: Slide; go?: (i: number) => void }) {
  const click = (id: string) => (e: MouseEvent) => { e.preventDefault(); go?.(indexOf(id)); };
  return (
    <header className={slide.tone === "dark" ? "on-dark" : ""}>
      <div className="wrap nav">
        <a className="brand" href="#home" onClick={click("home")} aria-label="CLANCLAST, first slide">
          <Logo height={34} surface={slide.tone === "dark" ? "dark" : "light"} priority />
        </a>
        <nav className="navlinks">
          {NAV.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={click(id)} className={(slide.nav ?? slide.id) === id ? "here" : ""}>{label}</a>
          ))}
        </nav>
      </div>
    </header>
  );
}

function Page({ slide, active, print = false }: { slide: Slide; active: boolean; print?: boolean }) {
  return (
    <DeckCtx.Provider value={{ active, print }}>
      <div className={`page tone-${slide.tone} p-${slide.id} ${active ? "on" : ""}`} aria-hidden={!active} aria-roledescription="slide" aria-label={slide.title}>
        {slide.body}
      </div>
    </DeckCtx.Provider>
  );
}

/** One slide with its header, scaled into a box (presenter view, print). */
function Frame({ i, fit = "box", print = false }: { i: number; fit?: "box" | "window"; print?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const s = useScale(fit, box);
  const slide = SLIDES[i];
  return (
    <div ref={box} className="frame-box">
      <div className="cc-site deck" style={print ? undefined : { transform: `translate(-50%,-50%) scale(${s})` }}>
        <Header slide={slide} />
        <Page slide={slide} active print={print} />
      </div>
    </div>
  );
}

export function Deck() {
  const q = new URLSearchParams(window.location.search);
  if (q.has("print")) return <Print />;
  if (q.has("presenter")) return <Presenter />;
  return <Audience />;
}

function Audience() {
  const [i, setI] = useState(fromHash);
  const [hint, setHint] = useState(true);
  const send = useChannel(useCallback((m: Msg) => { if (m.type === "go") setI(m.i); }, []));
  const s = useScale("window", useRef(null));
  const go = useCallback((n: number) => {
    setI((cur) => {
      const next = Math.max(0, Math.min(SLIDES.length - 1, n));
      if (next !== cur) { send({ type: "go", i: next }); history.replaceState(null, "", `#${SLIDES[next].id}`); }
      return next;
    });
  }, [send]);
  const fwd = useCallback(() => { if (SLIDES[i].id === "demo" && window.__pitchDemo?.next()) return; go(i + 1); }, [i, go]);
  const back = useCallback(() => { if (SLIDES[i].id === "demo" && window.__pitchDemo?.prev()) return; go(i - 1); }, [i, go]);

  useEffect(() => { const t = setTimeout(() => setHint(false), 5000); return () => clearTimeout(t); }, []);
  useEffect(() => { const on = () => go(fromHash()); window.addEventListener("hashchange", on); return () => window.removeEventListener("hashchange", on); }, [go]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement; if (t.closest("input, textarea, select")) return;
      const k = e.key;
      if (["ArrowRight", "PageDown", "Enter", "ArrowDown"].includes(k)) { e.preventDefault(); fwd(); }
      else if (k === " ") { e.preventDefault(); if (SLIDES[i].id === "demo" && window.__pitchDemo) window.__pitchDemo.toggle(); else fwd(); }
      else if (["ArrowLeft", "PageUp", "Backspace", "ArrowUp"].includes(k)) { e.preventDefault(); back(); }
      else if (k === "Home") go(0);
      else if (k === "End") go(MAIN.length - 1);
      else if (k === "b" || k === "B") go(i >= MAIN.length ? MAIN.length - 1 : MAIN.length);
      else if (k === "f" || k === "F") { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); }
      else if (k === "p" || k === "P") window.open(`${window.location.pathname}?presenter#${SLIDES[i].id}`, "clanclast-presenter", "width=1360,height=860");
      else if (k === "?") setHint((h) => !h);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [i, go, fwd, back]);

  // Buttons inside slides (e.g. the hero's calls to action) jump to a section.
  const onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest("[data-go]") as HTMLElement | null;
    if (a) { e.preventDefault(); go(indexOf(a.dataset.go!)); }
  };

  const slide = SLIDES[i];
  return (
    <div className="deck-root" onClick={onClick}>
      <div className="cc-site deck" style={{ transform: `translate(-50%,-50%) scale(${s})` }}>
        <Header slide={slide} go={go} />
        <div className="pages" style={{ transform: `translateY(${-i * H}px)` }}>
          {SLIDES.map((x, k) => <Page key={x.id} slide={x} active={k === i} />)}
        </div>
        <div className={`deck-ctl ${slide.tone === "dark" ? "on-dark" : ""}`}>
          <span className="count">{slide.backup ? "Questions" : `${String(i + 1).padStart(2, "0")} / ${String(MAIN.length).padStart(2, "0")}`}</span>
          <button onClick={back} aria-label="Previous">←</button>
          <button onClick={fwd} aria-label="Next">→</button>
        </div>
        <div className="deck-progress" aria-hidden="true"><i style={{ transform: `scaleX(${Math.min(i + 1, MAIN.length) / MAIN.length})` }} /></div>
        <div className={`deck-hint ${hint ? "on" : ""}`}>→ next · ← back · F full screen · P presenter view · B questions</div>
      </div>
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
        <div className="nav"><button onClick={() => go(i - 1)}>←</button><span>{slide.backup ? "Questions" : `${i + 1} / ${MAIN.length}`}</span><button onClick={() => go(i + 1)}>→</button></div>
      </header>
      <main>
        <div className="now"><Frame key={`n${i}`} i={i} /></div>
        <aside>
          <p className="next-label">Next: {next ? next.title : "End"}</p>
          <div className="next">{next && <Frame key={`x${i}`} i={i + 1} />}</div>
          <div className="notes"><h3>{slide.title}</h3><p>{slide.notes}</p>{slide.id === "demo" && <p className="tip">In the audience window, → moves to the next demo chapter; Space pauses.</p>}</div>
        </aside>
      </main>
    </div>
  );
}

function Print() {
  useEffect(() => { document.documentElement.classList.add("printing"); }, []);
  const only = new URLSearchParams(window.location.search).get("print");
  const list = only === "main" ? MAIN.map((_, k) => k) : only ? SLIDES.map((_, k) => k).filter((k) => String(k + 1) === only || SLIDES[k].id === only) : SLIDES.map((_, k) => k);
  return <div className="print">{list.map((k) => <Frame key={k} i={k} print />)}</div>;
}
