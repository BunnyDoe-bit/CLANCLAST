import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUpRight, Laptop, MonitorSmartphone, RotateCw, Smartphone } from "lucide-react";

/**
 * The real CLANCLAST apps, running live on the page: the provider workspace in a laptop
 * and the patient app in a phone, both signed in to fictional demo accounts and sharing
 * one in-browser data store, so what you do in one shows up in the other.
 */

const PROVIDER_VIEWS = [
  ["Today", "/provider"],
  ["Check-in", "/provider/check-in"],
  ["Patients", "/provider/patients"],
  ["Consent", "/provider/consent"],
  ["Summaries", "/provider/summaries"],
  ["Connect", "/provider/connect"],
] as const;
const PATIENT_VIEWS = [
  ["Today", "/patient"],
  ["Consent", "/patient/consent"],
  ["Vault", "/patient/vault"],
  ["Share", "/patient/share"],
  ["Access log", "/patient/activity"],
] as const;

const STORY = [
  ["Ask", "In the workspace, open Patients → Thandiwe Mokoena → Request access."],
  ["Decide", "On the phone, open Consent. Thandiwe allows it for 7 days, or declines."],
  ["See it land", "Back in the workspace, the request shows as approved, and the phone's access log records every look."],
] as const;

type Mode = "both" | "provider" | "patient";

/** Renders an app at its natural size and scales it to fit the frame. */
function ScaledFrame({ src, width, height, title, nonce }: { src: string; width: number; height: number; title: string; nonce: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / width);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={box} className="relative w-full overflow-hidden" style={{ height: scale ? height * scale : undefined, aspectRatio: scale ? undefined : `${width} / ${height}` }}>
      {scale > 0 && (
        <iframe
          key={`${src}#${nonce}`}
          src={`${src}${src.includes("?") ? "&" : "?"}embed=1`}
          title={title}
          width={width}
          height={height}
          loading="lazy"
          className="absolute left-0 top-0 origin-top-left border-0 bg-[#eef3f2]"
          style={{ width, height, transform: `scale(${scale})` }}
        />
      )}
    </div>
  );
}

function Chips({ items, value, onPick, label }: { items: readonly (readonly [string, string])[]; value: string; onPick: (v: string) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="live-chips">
      {items.map(([name, path]) => (
        <button key={path} role="tab" aria-selected={value === path} onClick={() => onPick(path)} className={value === path ? "on" : ""}>{name}</button>
      ))}
    </div>
  );
}

export function LiveProduct() {
  const root = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<Mode>("both");
  const [prov, setProv] = useState<string>(PROVIDER_VIEWS[0][1]);
  const [pat, setPat] = useState<string>(PATIENT_VIEWS[0][1]);
  const [nonce, setNonce] = useState({ prov: 0, pat: 0 });
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.innerWidth < 900);

  // Only start the apps when the section is close to the viewport.
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 900);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  const effective: Mode = narrow && mode === "both" ? "patient" : mode;
  const showProvider = effective !== "patient";
  const showPatient = effective !== "provider";

  return (
    <section className="liveprod" id="demo" ref={root} aria-labelledby="live-title">
      <div className="live-glow" aria-hidden="true" />
      <div className="wrap">
        <div className="live-head">
          <div>
            <span className="eyebrow">Live product</span>
            <h2 id="live-title">Not a mockup. <em>The product, running live.</em></h2>
            <p>These are the real CLANCLAST apps, running in your browser on fictional data. You're already signed in. Click around: everything works, and nothing you do leaves this browser.</p>
          </div>
          <div className="live-modes" role="tablist" aria-label="Choose what to show">
            {!narrow && <button role="tab" aria-selected={mode === "both"} className={mode === "both" ? "on" : ""} onClick={() => setMode("both")}><MonitorSmartphone size={16} /> Both</button>}
            <button role="tab" aria-selected={effective === "provider"} className={effective === "provider" ? "on" : ""} onClick={() => setMode("provider")}><Laptop size={16} /> {narrow ? "Provider" : "Provider workspace"}</button>
            <button role="tab" aria-selected={effective === "patient"} className={effective === "patient" ? "on" : ""} onClick={() => setMode("patient")}><Smartphone size={16} /> {narrow ? "Patient" : "Patient app"}</button>
          </div>
        </div>

        <div className={`live-stage ${effective}`}>
          {showProvider && (
            <figure className={narrow ? "live-phone" : "live-laptop"}>
              {narrow ? (
                <div className="phone-body"><div className="phone-notch" />{visible && <ScaledFrame src={prov} width={390} height={800} title="CLANCLAST provider workspace, live demo" nonce={nonce.prov} />}</div>
              ) : (
                <>
                  <div className="laptop-screen">
                    <div className="browser-bar">
                      <span className="dots"><i /><i /><i /></span>
                      <span className="url">clanclast.health{prov}</span>
                      <button onClick={() => setNonce((n) => ({ ...n, prov: n.prov + 1 }))} aria-label="Reload the provider workspace"><RotateCw size={13} /></button>
                    </div>
                    {visible ? <ScaledFrame src={prov} width={1320} height={800} title="CLANCLAST provider workspace, live demo" nonce={nonce.prov} /> : <div className="live-placeholder" style={{ aspectRatio: "1320 / 800" }} />}
                  </div>
                  <div className="laptop-base" aria-hidden="true" />
                </>
              )}
              <figcaption>
                <Chips items={PROVIDER_VIEWS} value={prov} onPick={(v) => { setProv(v); setNonce((n) => ({ ...n, prov: n.prov + 1 })); }} label="Provider workspace screens" />
                <a href={prov} className="live-open">Open full screen <ArrowUpRight size={14} /></a>
              </figcaption>
            </figure>
          )}
          {showPatient && (
            <figure className="live-phone">
              <div className="phone-body">
                <div className="phone-notch" />
                {visible ? <ScaledFrame src={pat} width={390} height={800} title="CLANCLAST patient app, live demo" nonce={nonce.pat} /> : <div className="live-placeholder" style={{ aspectRatio: "390 / 800" }} />}
              </div>
              <figcaption>
                <Chips items={PATIENT_VIEWS} value={pat} onPick={(v) => { setPat(v); setNonce((n) => ({ ...n, pat: n.pat + 1 })); }} label="Patient app screens" />
                <span className="live-row">
                  <button onClick={() => setNonce((n) => ({ ...n, pat: n.pat + 1 }))} className="live-open"><RotateCw size={13} /> Refresh</button>
                  <a href={pat} className="live-open">Open full screen <ArrowUpRight size={14} /></a>
                </span>
              </figcaption>
            </figure>
          )}
        </div>

        <ol className="live-story">
          {STORY.map(([t, d], i) => (
            <li key={t}><span className="n">{i + 1}</span><div><b>{t}</b><p>{d}</p></div></li>
          ))}
        </ol>
        <p className="live-note">Demo accounts: patient <b>082 555 0198 · Patient123!</b> · provider <b>dr.naidoo@riverside.demo · Provider123!</b>. Fictional people and institutions. Data stays in this browser; reset any time from the demo badge.</p>
      </div>
    </section>
  );
}
