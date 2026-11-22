import { useEffect, useRef, useState, type FormEvent } from "react";
import { AccessTiles, type LandingContext } from "./AccessTiles";
import { Logo } from "../shared/Brand";
import { HeroMetalScales } from "./HeroMetalScales";
import { landingImages, brandPhotos as P, tileIcons } from "./landingAssets";
import "./maven-landing.css";

/**
 * CLANCLAST marketing site — React port of CLANCLAST_Maven_Inspired_Website.html.
 *
 * The layout, copy, colours and interactions come straight from that HTML file
 * (all of its CSS lives in maven-landing.css, scoped under `.cc-site` so it can
 * not leak into the patient / provider / connect / verify screens). What's new
 * is the wiring into the working app: product cards and the "Try the working
 * prototypes" section call `setContext(...)`, exactly like the old landing page
 * did, so every portal in this project is reachable from the new design.
 */

type Go = (c: LandingContext) => void;

const NAV = [
  ["#platform", "Platform"],
  ["#how", "How it works"],
  ["#trust", "Trust & security"],
  ["#institutions", "Institutions"],
  ["#prototype", "Prototypes"],
  ["#progress", "Progress"],
] as const;

const STEPS = [
  {
    mode: "STEP 01 · IDENTITY",
    title: "One person. Fewer fragments.",
    desc: "Records that may belong to the same person are brought together with a clear reason. A person decides every uncertain case.",
    heading: "Candidate identity review",
    rows: [["Possible match", "Reason shown"], ["Uncertain case", "Sent to a person"], ["Decision", "Human review"]],
  },
  {
    mode: "STEP 02 · CONSENT",
    title: "Permission stays with the patient.",
    desc: "A protected request is presented to the patient. Access is not granted by the provider screen alone.",
    heading: "Workflow detail",
    rows: [["Requesting provider", "Authenticated"], ["Patient choice", "Approve / decline"], ["Access", "Scoped & logged"]],
  },
  {
    mode: "STEP 03 · VERIFICATION",
    title: "Trust that can travel.",
    desc: "An institution-signed, dated summary can be checked even without a live connection.",
    heading: "Workflow detail",
    rows: [["Issuer", "Checked offline"], ["Version & date", "Displayed"], ["Clinical authority", "Source institution"]],
  },
];

const AUDIENCES = {
  hospital: {
    tab: "Hospitals & groups",
    title: "Understand identity duplication in your records.",
    desc: "A first study uses one hospital's historical, pseudonymised export to produce a duplicate-identity report, with a reason for every suggestion. The report is advisory; the institution decides.",
    list: ["Duplicate-identity report", "Human review for uncertain matches", "Audit trail for every decision", "No automatic record merging"],
  },
  lab: {
    tab: "Laboratories",
    title: "Help identity travel with the patient.",
    desc: "Laboratories are part of a fragmented healthcare network. CLANCLAST is designed to help authorised institutions establish trusted identity and consent workflows without taking ownership of laboratory records.",
    list: ["Interoperate with existing systems", "Institution remains source of truth", "Consent-aware information requests", "No clinical record copies held by CLANCLAST"],
  },
  scheme: {
    tab: "Medical schemes",
    title: "Strengthen trust across membership boundaries.",
    desc: "Identity resolution can help institutions investigate duplicate identities and overlapping records. The extent of any addressable fraud or savings must be measured; CLANCLAST does not claim a proven reduction.",
    list: ["A reason for every suggestion", "Human review of uncertain matches", "Auditable identity decisions", "Aggregate insights, not identifiable-data sales"],
  },
  public: {
    tab: "Public health",
    title: "Design for real-world connectivity conditions.",
    desc: "The long-term architecture considers smartphone, feature-phone, USSD, SMS and physical-card access, while keeping institutions in control of their records and patients in control of consent.",
    list: ["Low-data and offline-aware design", "Patient-held signed summaries", "Institution-controlled record ownership", "Staged adoption with evidence gates"],
  },
} as const;
type AudienceKey = keyof typeof AUDIENCES;

const TILE_MS = 5000; // how long each platform tile stays open before sliding to the next

const TILES = [
  { title: "Referral routing", blurb: "Designed to route a referral to the right institution, with identity and consent already resolved.", img: landingImages.referralStage, icon: tileIcons.referral, pos: "34% 50%" },
  { title: "Identity & intake", blurb: "Resolve who the patient is and request their permission before the first visit, not at the front desk.", img: landingImages.intakeStage, icon: tileIcons.identity, pos: "50% 40%" },
  { title: "Verified trust", blurb: "Credentials, institutions and summaries checked before information is trusted, even offline.", img: landingImages.followUpStage, icon: tileIcons.trust, pos: "50% 30%" },
  { title: "Coordinated care", blurb: "Institutions collaborate through a thin trust layer while continuing to own their own systems.", img: landingImages.careStage, icon: tileIcons.care, pos: "50% 50%" },
  { title: "Reach & follow-up", blurb: "Consent and verification designed for the channels people actually have: app, USSD and physical card.", img: landingImages.community, icon: tileIcons.reach, pos: "50% 50%" },
];

const AUDIENCE_IMG: Record<string, { img: { src: string; alt: string }; pos: string }> = {
  hospital: { img: P.hospitalBuilding, pos: "50% 50%" },
  lab: { img: P.bodyUi, pos: "50% 40%" },
  scheme: { img: P.globeAfrica, pos: "50% 50%" },
  public: { img: P.capeTown, pos: "50% 45%" },
};

type ProdId = "id" | "verify" | "provider" | "connect" | "insights" | "health";

const PRODUCTS: { id: ProdId; icon: string; name: string; tag: string; blurb: string; ctx?: LandingContext; cta?: string }[] = [
  { id: "id", icon: "⌕", name: "CLANCLAST ID", tag: "Identity", blurb: "Find the same person across fragmented records, with a clear reason for each suggestion. Uncertain cases go to a person to decide. Nothing is merged automatically." },
  { id: "verify", icon: "✓", name: "CLANCLAST Verify", tag: "Consent & credentials", blurb: "Consent, credentials and verification, with an auditable trail of every decision.", ctx: "verify", cta: "Open Verify prototype" },
  { id: "provider", icon: "⌘", name: "CLANCLAST Provider", tag: "Clinical access", blurb: "Authenticate clinical staff, apply role-based access and surface authorised information requests.", ctx: "provider", cta: "Open Provider prototype" },
  { id: "connect", icon: "⇄", name: "CLANCLAST Connect", tag: "Interoperability", blurb: "Route authorised requests between institution systems. Holds no clinical content.", ctx: "connect", cta: "Open Connect prototype" },
  { id: "insights", icon: "▥", name: "CLANCLAST Insights", tag: "Operational analytics", blurb: "De-identified, aggregate operational analytics for institutional customers." },
  { id: "health", icon: "▣", name: "CLANCLAST Health", tag: "Stage 2 · Patient layer", blurb: "A patient-facing wallet for credentials and institution-signed summaries, a consent centre, and card and USSD interfaces. Summaries live on the patient’s own device or card.", ctx: "patient", cta: "Open Health prototype" },
];

function VerifyDemo() {
  const [s, setS] = useState<"pending" | "allowed" | "declined">("pending");
  return (
    <div className="pe-card">
      <div className="pe-card-top"><span>CONSENT REQUEST</span><b className="pe-sim">SIMULATED</b></div>
      <div className="pe-title">Riverside General Hospital</div>
      <p className="pe-sub">Requests permission to access your laboratory results · 7 days</p>
      <div className="pe-btns">
        <button type="button" className="allow" onClick={() => setS("allowed")}>Allow access</button>
        <button type="button" onClick={() => setS("declined")}>Decline</button>
      </div>
      <p className="pe-state">
        {s === "allowed" ? "Demo: approved. No real access has been granted." : s === "declined" ? "Demo: declined. Your choice is respected." : "You decide. Signed summaries can be verified even offline."}
      </p>
    </div>
  );
}

function ProductVisual({ id }: { id: ProdId }) {
  if (id === "verify") return <VerifyDemo />;

  if (id === "id") {
    const rows: [string, string, string, number][] = [
      ["Thandi Mokoena", "Possible match", "", 82],
      ["Thandiwe Mokoena", "Needs review", "warn", 64],
      ["T. Mokoena", "Possible match", "", 48],
    ];
    return (
      <div className="pe-card">
        <div className="pe-card-top"><span>IDENTITY REVIEW</span><b className="pe-sim">SIMULATED</b></div>
        {rows.map(([n, s, w, pct], k) => (
          <div className="pe-row" key={n}>
            <span>{n}</span>
            <b className={w}>{s}</b>
            <span className="pe-bar"><i style={{ width: `${pct}%`, animationDelay: `${k * 0.15}s` }} /></span>
          </div>
        ))}
        <p className="pe-state">Uncertain matches go to a human reviewer. Nothing is merged automatically.</p>
      </div>
    );
  }

  if (id === "provider") {
    const rows: [string, string, string, string][] = [
      ["Doctor", "Clinical summary and consented results", "", "With consent"],
      ["Nurse", "Care plan and observations", "", "With consent"],
      ["Registration clerk", "Demographics only", "warn", "No clinical data"],
    ];
    return (
      <div className="pe-card">
        <div className="pe-card-top"><span>ROLE-BASED ACCESS</span><b className="pe-sim">SIMULATED</b></div>
        {rows.map(([r, a, w, chip]) => (
          <div className="pe-row" key={r}>
            <span><strong>{r}</strong><br /><small>{a}</small></span>
            <b className={w}>{chip}</b>
          </div>
        ))}
        <p className="pe-state">Every access request is logged and can be audited.</p>
      </div>
    );
  }

  if (id === "connect") {
    const left: [string, number][] = [["Hospital", 40], ["Laboratory", 105], ["Scheme", 170]];
    const right: [string, number][] = [["Clinic", 55], ["Pharmacy", 155]];
    return (
      <div className="pe-card">
        <div className="pe-card-top"><span>ROUTING LAYER</span><b className="pe-sim">ILLUSTRATIVE</b></div>
        <svg className="pe-svg" viewBox="0 0 440 210" role="img" aria-label="Institutions connected through CLANCLAST Connect">
          {left.map(([, y], k) => <path key={`l${k}`} d={`M92 ${y} C 170 ${y}, 170 105, 190 105`} className="pe-flow" style={{ animationDelay: `${k * 0.3}s` }} />)}
          {right.map(([, y], k) => <path key={`r${k}`} d={`M250 105 C 290 105, 290 ${y}, 348 ${y}`} className="pe-flow" style={{ animationDelay: `${k * 0.4}s` }} />)}
          {left.map(([t, y]) => (<g key={t}><rect x="8" y={y - 16} width="84" height="32" rx="10" className="pe-node" /><text x="50" y={y + 4} textAnchor="middle" className="pe-txt">{t}</text></g>))}
          {right.map(([t, y]) => (<g key={t}><rect x="348" y={y - 16} width="84" height="32" rx="10" className="pe-node" /><text x="390" y={y + 4} textAnchor="middle" className="pe-txt">{t}</text></g>))}
          <circle cx="220" cy="105" r="32" className="pe-hub" />
          <text x="220" y="109" textAnchor="middle" className="pe-hubtxt">Connect</text>
        </svg>
        <p className="pe-state">Requests are routed and queued. No clinical content is held.</p>
      </div>
    );
  }

  if (id === "insights") {
    return (
      <div className="pe-card">
        <div className="pe-card-top"><span>AGGREGATE VIEW</span><b className="pe-sim">SIMULATED</b></div>
        <div className="pe-bars">{[38, 56, 44, 72, 60, 84, 68].map((h, k) => <i key={k} style={{ height: `${h}%`, animationDelay: `${k * 0.08}s` }} />)}</div>
        <p className="pe-state">De-identified and aggregated. Never patient-level data.</p>
      </div>
    );
  }

  const wallet: [string, string][] = [["Identity credential", "Verified ✓"], ["Signed summary", "On your device"], ["Consent centre", "You decide"], ["Emergency information", "Ready to share"]];
  return (
    <div className="pe-card">
      <div className="pe-card-top"><span>MY TRUSTED CREDENTIALS</span><b className="pe-sim">SIMULATED</b></div>
      {wallet.map(([a, b]) => (<div className="pe-row" key={a}><span>{a}</span><b>{b}</b></div>))}
      <p className="pe-state">Nothing is stored on CLANCLAST servers.</p>
    </div>
  );
}

function ProductExplorer({ setContext }: { setContext: Go }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const autoplay = !paused && !reduced;
  const p = PRODUCTS[i];

  useEffect(() => {
    if (!autoplay) return;
    const id = window.setTimeout(() => setI((n) => (n + 1) % PRODUCTS.length), 7000);
    return () => window.clearTimeout(id);
  }, [i, autoplay]);

  return (
    <div className="pe reveal" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="pe-list" role="tablist" aria-label="CLANCLAST products">
        {PRODUCTS.map((x, n) => (
          <button key={x.id} type="button" role="tab" aria-selected={i === n} className={`pe-item${i === n ? " active" : ""}`} onClick={() => setI(n)}>
            <span className="pe-ico">{x.icon}</span>
            <span><strong>{x.name}</strong><small>{x.tag}</small></span>
            <span className="pe-arrow">→</span>
          </button>
        ))}
      </div>

      <div className="pe-stage" role="tabpanel">
        <div key={p.id} className="pe-slide">
          <div className="pe-copy">
            <span className="pe-eyebrow">{p.tag}</span>
            <h3>{p.name}</h3>
            <p>{p.blurb}</p>
          </div>
          <div className="pe-visual"><ProductVisual id={p.id} /></div>
          <div className="pe-actions">
            {p.ctx ? (
              <button type="button" className="btn light small" onClick={() => setContext(p.ctx!)}>{p.cta} <span className="arrow">↗</span></button>
            ) : (
              <span className="pe-note">Concept · no prototype yet</span>
            )}
            <button type="button" className="btn outline small" onClick={() => setI((i + 1) % PRODUCTS.length)}>Next product <span className="arrow">→</span></button>
          </div>
        </div>
        {autoplay && <span key={`pg-${i}`} className="pe-progress" aria-hidden="true" />}
      </div>
    </div>
  );
}

export function MavenLanding({ setContext }: { setContext: Go }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [consent, setConsent] = useState<"pending" | "allowed" | "declined">("pending");
  const [step, setStep] = useState(0);
  const [audience, setAudience] = useState<AudienceKey>("hospital");
  const [sent, setSent] = useState(false);
  const [tile, setTile] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tilesInView, setTilesInView] = useState(true);
  const [reducedMotion] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
  const tilesRef = useRef<HTMLDivElement>(null);
  const touchTimer = useRef<number | undefined>(undefined);

  // Platform tiles: only autoplay while visible, and never for reduced-motion visitors.
  useEffect(() => {
    const el = tilesRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setTilesInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const autoplay = !paused && tilesInView && !reducedMotion;
  useEffect(() => {
    if (!autoplay) return;
    const id = window.setTimeout(() => setTile((t) => (t + 1) % TILES.length), TILE_MS);
    return () => window.clearTimeout(id);
  }, [tile, autoplay]);
  useEffect(() => () => window.clearTimeout(touchTimer.current), []);

  // Scroll-reveal, same behaviour as the original page.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll(".reveal");
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.12 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    setSent(true);
    form.reset();
  }

  const s = STEPS[step];
  const a = AUDIENCES[audience];

  return (
    <div className="cc-site" ref={rootRef}>
      <header>
        <div className="wrap nav">
          <a className="brand" href="#home" aria-label="CLANCLAST home">
            <Logo height={30} surface="light" priority />
          </a>
          <nav className={`navlinks${menuOpen ? " open" : ""}`} id="navlinks">
            {NAV.map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
          </nav>
          <div className="nav-actions">
            <a className="btn small outline" href="#prototype">Try the prototypes</a>
            <a className="btn small" href="#contact">Request a briefing <span className="arrow">↗</span></a>
            <button className="menu-btn" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen((o) => !o)}>
              {menuOpen ? "×" : "☰"}
            </button>
          </div>
        </div>
      </header>

      <div className="cc-main">
        {/* ---------- HERO ---------- */}
        <section className="hero" id="home">
          <div className="hero-bg" aria-hidden="true">
            <HeroMetalScales />
            <div className="hero-scrim" />
          </div>
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">Federated healthcare trust &amp; identity</span>
              <h1>No patient a stranger to their own <em>healthcare system.</em></h1>
              <p>CLANCLAST connects hospitals, laboratories and medical schemes without replacing the systems they already use — helping identity, consent and trusted information move with people.</p>
              <div className="hero-ctas">
                <a className="btn" href="#how">See how it works <span className="arrow">↗</span></a>
                <a className="btn outline" href="#contact">Partner with us</a>
              </div>
              <div className="trust-mini">
                <span><i className="check">✓</i> No clinical records stored</span>
                <span><i className="check">✓</i> Patient-led consent</span>
                <span><i className="check">✓</i> Designed for low connectivity</span>
              </div>
            </div>
            <div className="hero-visual">
              <div className="visual-orbit" />
              <div className="hero-photo" aria-hidden="false">
                <img src={P.doctorElderSmile.src} alt={P.doctorElderSmile.alt} loading="eager" />
              </div>
              <div className="float-tag one"><b>01 / ID</b>Identity resolved</div>
              <div className="float-tag two"><b>Offline-ready</b>Trust can travel</div>
              <div className="hero-panel">
                <div className="panel-top">
                  <span className="panel-brand">CLANCLAST <span style={{ color: "#8dd4ca" }}>/ VERIFY</span></span>
                  <span className="live">● INTERACTIVE DEMO</span>
                </div>
                <div className="request-card">
                  <small>CONSENT REQUEST · SIMULATED DATA</small>
                  <h3>Riverside General Hospital</h3>
                  <p>Requests permission to access your laboratory results.</p>
                  <div className="request-meta"><span>Purpose · Continuity of care</span><span>7 days</span></div>
                  <div className="choice-row">
                    <button onClick={() => setConsent("allowed")}>Allow access</button>
                    <button onClick={() => setConsent("declined")}>Decline</button>
                  </div>
                  <p
                    style={{
                      fontSize: 10,
                      marginTop: 10,
                      color: consent === "allowed" ? "#2c8176" : consent === "declined" ? "#8a5a00" : "#4a625f",
                    }}
                  >
                    {consent === "allowed"
                      ? "Demo state: consent approved for this simulated request. No real access has been granted."
                      : consent === "declined"
                      ? "Demo state: request declined. Your choice is respected."
                      : "You decide. Access can be revoked where technically and legally feasible."}
                  </p>
                </div>
                <div className="offline-card">
                  <div className="offline-icon">⌁</div>
                  <div>
                    <strong>
                      {consent === "allowed" ? "Consent recorded · demo" : consent === "declined" ? "Request declined · demo" : "Verification can travel offline"}
                    </strong>
                    <span>Signed summary · issuer · version · date</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="trust-strip">
          <div className="wrap">
            <div className="trust-item"><i>⌁</i> Identity across institutions</div>
            <div className="trust-item"><i>✓</i> Consent stays with the patient</div>
            <div className="trust-item"><i>◈</i> Verifiable credentials</div>
            <div className="trust-item"><i>↗</i> Works alongside existing systems</div>
          </div>
        </div>

        {/* ---------- PROBLEM ---------- */}
        <section className="section problem" id="story">
          <div className="wrap problem-grid">
            <div className="problem-copy reveal">
              <span className="eyebrow">Where care breaks</span>
              <h2>Every boundary a patient crosses is a place trust can be lost.</h2>
              <p>Different facilities, disconnected systems, inconsistent identities and unavailable networks can make it difficult to confirm who a person is and whether information may be shared. CLANCLAST is designed to address the trust layer between those systems — not replace them.</p>
              <p style={{ marginTop: 18, fontSize: 12 }}>The figures shown are reported third-party context, not savings or outcomes achieved by CLANCLAST.</p>
              <figure className="photo-card">
                <img src={landingImages.heroFallback.src} alt={landingImages.heroFallback.alt} loading="lazy" style={{ objectPosition: "50% 30%" }} />
                <figcaption>Illustrative photograph</figcaption>
              </figure>
            </div>
            <div className="stat-stack reveal">
              <div className="stat"><strong>R30bn</strong><p><span className="tag">Reported estimate</span><br />Estimated annual healthcare fraud, waste and abuse.<span className="source">BHF / SIU, July 2026</span></p></div>
              <div className="stat"><strong>R76bn</strong><p><span className="tag">Reported</span><br />Public-sector medico-legal contingent liability in 2023/24.<span className="source">National Treasury, March 2025 Budget Review</span></p></div>
              <div className="stat"><strong>122–209</strong><p><span className="tag">Reported</span><br />Published public-clinic waiting times in minutes, against a 120-minute target.<span className="source">SAMJ / Gauteng DoH research</span></p></div>
            </div>
          </div>
        </section>

        {/* ---------- THESIS ---------- */}
        <section className="section thesis">
          <div className="wrap thesis-grid">
            <div className="reveal">
              <span className="eyebrow">One thin trust layer</span>
              <h2>Identity. Consent. Continuity.</h2>
              <p>Three connected capabilities help healthcare institutions collaborate safely while continuing to own and operate their existing systems.</p>
              <figure className="photo-card" style={{ height: 230 }}>
                <img src={P.blocksNetwork.src} alt={P.blocksNetwork.alt} loading="lazy" />
                <figcaption>Illustrative graphic</figcaption>
              </figure>
            </div>
            <div className="pillars reveal">
              <div className="pillar"><div className="pillar-num">01</div><div><h3>Identity that connects</h3><p>Find the same patient across fragmented records, with a clear reason for each suggestion and human review for uncertain matches.</p></div></div>
              <div className="pillar"><div className="pillar-num">02</div><div><h3>Consent that belongs to people</h3><p>Give patients control over who may access authorised information, with consent designed for app, USSD and physical-card channels.</p></div></div>
              <div className="pillar"><div className="pillar-num">03</div><div><h3>Continuity when networks fail</h3><p>Verify institution-signed, patient-carried summaries offline, with clear issuer, version and date information.</p></div></div>
            </div>
          </div>
        </section>

        {/* ---------- PLATFORM ---------- */}
        <section className="section platform" id="platform">
          <div className="wrap">
            <div className="section-head reveal">
              <span className="eyebrow">The CLANCLAST platform</span>
              <h2>A connected trust infrastructure. Not another hospital system.</h2>
              <p>Each product has a defined responsibility and a deliberately limited data boundary.</p>
            </div>
            <div
              ref={tilesRef}
              className="photo-tiles reveal"
              role="group"
              aria-label="Patient journey moments"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onTouchStart={() => {
                setPaused(true);
                window.clearTimeout(touchTimer.current);
                touchTimer.current = window.setTimeout(() => setPaused(false), 8000);
              }}
            >
              {TILES.map((t, i) => (
                <button key={t.title} type="button" className={`photo-tile${tile === i ? " active" : ""}`} onClick={() => setTile(i)} onMouseEnter={() => setTile(i)} aria-pressed={tile === i}>
                  <img className="ph" src={t.img.src} alt={t.img.alt} loading="lazy" style={{ objectPosition: t.pos }} />
                  <img className="tile-icon" src={t.icon} alt="" aria-hidden="true" />
                  <span className="cap">
                    <span className="idx">{String(i + 1).padStart(2, "0")} / {String(TILES.length).padStart(2, "0")}</span>
                    <h3>{t.title}</h3>
                    <p>{t.blurb}</p>
                  </span>
                  {tile === i && autoplay && <span key={`p-${tile}`} className="progress" aria-hidden="true" />}
                </button>
              ))}
            </div>
            <ProductExplorer setContext={setContext} />
          </div>
        </section>

        {/* ---------- HOW IT WORKS ---------- */}
        <section className="section steps" id="how">
          <div className="wrap">
            <div className="section-head reveal">
              <span className="eyebrow">How it works</span>
              <h2>From “who is this?” to “yes, you may”.</h2>
              <p>A clear sequence of identity resolution, patient permission and trusted verification.</p>
            </div>
            <div className="steps-layout">
              <div className="steps-list reveal">
                {[
                  ["Match identity", "Records that may belong to the same person are found. Uncertain cases go to a person to decide."],
                  ["Ask for consent", "A protected request is sent to the patient, who can approve or decline on an available channel."],
                  ["Verify, even offline", "An institution-signed summary can be checked without a live network."],
                ].map(([h, p], i) => (
                  <div key={h} className={`step${step === i ? " active" : ""}`} onClick={() => setStep(i)} role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStep(i); } }}>
                    <div className="step-num">{i + 1}</div>
                    <div><h3>{h}</h3><p>{p}</p></div>
                  </div>
                ))}
              </div>
              <div className="step-screen reveal">
                <div className="screen-top"><span>CLANCLAST / WORKFLOW PREVIEW</span><span className="screen-chip">{s.mode}</span></div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <div className="screen-content">
                  <h4>{s.heading} <span style={{ fontSize: 9, color: "#8a5a00" }}>· SIMULATED</span></h4>
                  {s.rows.map(([k, v]) => (
                    <div className="screen-row" key={k}><span>{k}</span><b>{v}</b></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- PEOPLE FIRST (photo mosaic) ---------- */}
        <section className="section mosaic-section" id="people">
          <div className="wrap">
            <div className="section-head reveal">
              <span className="eyebrow">People first</span>
              <h2>Technology in service of the person in front of you.</h2>
              <p>Every identity match, consent request and verification is designed around one goal: helping care begin with trust.</p>
            </div>
            <div className="mosaic reveal">
              <figure className="m a"><img src={P.globeCrossHand.src} alt={P.globeCrossHand.alt} loading="lazy" style={{ objectPosition: "50% 60%" }} /></figure>
              <figure className="m b"><img src={P.doctorElderScarf.src} alt={P.doctorElderScarf.alt} loading="lazy" style={{ objectPosition: "50% 30%" }} /></figure>
              <figure className="m c"><img src={P.handsDoctor.src} alt={P.handsDoctor.alt} loading="lazy" /></figure>
              <figure className="m d"><img src={P.leafDrops.src} alt={P.leafDrops.alt} loading="lazy" /></figure>
              <figure className="m e"><img src={P.womanBedSmile.src} alt={P.womanBedSmile.alt} loading="lazy" style={{ objectPosition: "50% 30%" }} /></figure>
              <figure className="m f"><img src={P.clinicLobby.src} alt={P.clinicLobby.alt} loading="lazy" /></figure>
            </div>
            <p className="mosaic-note">Photographs and graphics are illustrative.</p>
          </div>
        </section>

        {/* ---------- WORKING PROTOTYPES (new — wires the app into the site) ---------- */}
        <section className="section proto" id="prototype">
          <div className="wrap">
            <div className="section-head reveal">
              <span className="eyebrow">Working prototypes</span>
              <h2>See the workflows running, not just described.</h2>
              <p>These screens run entirely in your browser with fictional demonstration data. Nothing you type is sent anywhere. They show intended workflows; they are not the production systems.</p>
            </div>
          </div>
          <AccessTiles setContext={setContext} />
          <div className="wrap" style={{ paddingTop: 8 }}>
            <div className="proto-links reveal">
              <button className="btn outline small" onClick={() => setContext("ussd")}>Try the USSD experience <span className="arrow">→</span></button>
              <button className="btn outline small" onClick={() => setContext("caregiver")}>Caregiver sign in <span className="arrow">→</span></button>
              <button className="btn outline small" onClick={() => setContext("onboard")}>Onboard an organisation <span className="arrow">→</span></button>
            </div>
            <p className="proto-note reveal">Please use demonstration data only. Do not enter real patient or personal health information into the prototypes.</p>
          </div>
        </section>

        {/* ---------- CONTINUITY ---------- */}
        <section className="section offline">
          <div className="wrap">
            <div className="head-split">
              <div className="section-head reveal">
                <span className="eyebrow">Designed for continuity</span>
                <h2>When the source system is down, the trust layer still has a role.</h2>
                <p>CLANCLAST makes identity and consent resilient. It does not promise that an institution's clinical records will be available when that institution is offline.</p>
              </div>
              <figure className="photo-card map reveal">
                <img src={P.africaNetwork.src} alt={P.africaNetwork.alt} loading="lazy" />
                <figcaption>Illustrative network graphic</figcaption>
              </figure>
            </div>
            <div className="fallback-grid">
              <div className="fallback reveal"><div className="num">01</div><h3>Patient-carried summary</h3><p>An institution-signed summary can be checked without a network, showing who issued it and when. It remains advisory, not a replacement for the source record.</p><small>Works without network</small></div>
              <div className="fallback reveal"><div className="num">02</div><h3>Institution backup</h3><p>Where an institution runs its own backup, an authorised request can still reach it, with the patient's consent.</p><small>Institution-owned resilience</small></div>
              <div className="fallback reveal"><div className="num">03</div><h3>Request waits</h3><p>If neither is available, a request waits for the connection to return. No clinical data is held while it waits.</p><small>Completes on recovery</small></div>
            </div>
          </div>
        </section>

        {/* ---------- COMMITMENTS ---------- */}
        <section className="promise" id="trust">
          <div className="wrap promise-inner">
            <div className="reveal">
              <span className="eyebrow">The CLANCLAST commitments</span>
              <h2>Trust is built into what we choose not to hold.</h2>
              <p>Privacy is not a feature added later. It shapes the architecture, the product boundaries and the way institutions work together.</p>
              <a className="btn" style={{ marginTop: 26 }} href="#contact">Discuss our trust model <span className="arrow">↗</span></a>
              <figure className="photo-card" style={{ height: 240 }}>
                <img src={P.holdingHands.src} alt={P.holdingHands.alt} loading="lazy" />
                <figcaption>Illustrative photograph</figcaption>
              </figure>
            </div>
            <div className="never-list reveal">
              {[
                "We never store clinical records.",
                "We never monetise identifiable patient data.",
                "We do not put patient-linked data on a public ledger.",
                "We do not ask institutions to replace their existing systems.",
                "No institution's record is changed without its approval.",
              ].map((t) => (
                <div className="never" key={t}><span>✓</span> {t}</div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- INSTITUTIONS ---------- */}
        <section className="section audience" id="institutions">
          <div className="wrap">
            <div className="section-head reveal">
              <span className="eyebrow">Built to work across healthcare</span>
              <h2>One trust layer. Different institutional needs.</h2>
              <p>CLANCLAST is designed to interoperate with the organisations that already hold and manage healthcare information.</p>
            </div>
            <div className="audience-tabs" role="tablist">
              {(Object.keys(AUDIENCES) as AudienceKey[]).map((k) => (
                <button key={k} role="tab" aria-selected={audience === k} className={audience === k ? "active" : ""} onClick={() => setAudience(k)}>
                  {AUDIENCES[k].tab}
                </button>
              ))}
            </div>
            <div className="audience-panel reveal">
              <div className="audience-photo">
                <img key={audience} src={AUDIENCE_IMG[audience].img.src} alt={AUDIENCE_IMG[audience].img.alt} loading="lazy" style={{ objectPosition: AUDIENCE_IMG[audience].pos }} />
              </div>
              <div>
                <span className="tag">INSTITUTIONAL USE CASE</span>
                <h3>{a.title}</h3>
                <p>{a.desc}</p>
              </div>
              <div className="audience-list">
                {a.list.map((x) => (<div key={x}><b>→</b> {x}</div>))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- PROGRESS ---------- */}
        <section className="section progress" id="progress">
          <div className="wrap">
            <div className="section-head reveal">
              <span className="eyebrow">Progress, honestly</span>
              <h2>Evidence before expansion.</h2>
              <p>CLANCLAST advances through defined stages. Each stage has a trigger; progress is not claimed before the evidence exists.</p>
            </div>
            <div className="stage-grid">
              <div className="stage current reveal"><div className="status">● Current</div><h3>Stage 1: Prove it on real records</h3><p>A duplicate-identity study on one institution's historical records, measured against the institution's own staff.</p></div>
              <div className="stage reveal"><div className="status">Next · Gated</div><h3>Stage 2: Early production</h3><p>Live identity, consent and verification with a partner institution, once the required reviews are in place.</p></div>
              <div className="stage reveal"><div className="status">Later · Gated</div><h3>Stage 3: Scale</h3><p>More institutions and regions, when the evidence from earlier stages supports it.</p></div>
            </div>
            <div className="progress-note"><b>Current status:</b> Pre-pilot. The prototypes on this site use fictional data and show intended workflows. Accuracy is measured with each partner institution, on its own records, before any live use.</div>
          </div>
        </section>

        {/* ---------- CONTACT ---------- */}
        <section className="section contact" id="contact">
          <div className="wrap contact-grid">
            <div className="reveal">
              <span className="eyebrow">Start a conversation</span>
              <h2>Let's make healthcare systems work better together.</h2>
              <p>Whether you represent a hospital, laboratory, medical scheme or public-health institution, we'd welcome a conversation about identity resolution and a potential Stage 1 study.</p>
              <div className="contact-info">
                <div><i>↗</i> Institutional briefings &amp; pilot discussions</div>
                <div><i>⌁</i> Interoperability and trust infrastructure</div>
                <div><i>✓</i> Evidence-led, privacy-conscious approach</div>
              </div>
              <figure className="photo-card" style={{ height: 260 }}>
                <img src={P.womanLookingUp.src} alt={P.womanLookingUp.alt} loading="lazy" style={{ objectPosition: "50% 20%" }} />
                <figcaption>Illustrative photograph</figcaption>
              </figure>
            </div>
            <form className="form-card reveal" onSubmit={onSubmit}>
              {sent && (
                <div className="success" style={{ display: "block" }}>
                  Thank you. Online enquiries are not open yet, so nothing was sent. Please contact us through your existing CLANCLAST contact for now.
                </div>
              )}
              <div className="form-grid">
                <div className="field"><label htmlFor="cc-name">Full name *</label><input id="cc-name" name="name" required placeholder="Your name" /></div>
                <div className="field"><label htmlFor="cc-email">Work email *</label><input id="cc-email" name="email" type="email" required placeholder="you@organisation.co.za" /></div>
                <div className="field"><label htmlFor="cc-org">Organisation *</label><input id="cc-org" name="organisation" required placeholder="Organisation name" /></div>
                <div className="field"><label htmlFor="cc-role">Your role *</label><input id="cc-role" name="role" required placeholder="e.g. CIO, Operations Lead" /></div>
                <div className="field full">
                  <label htmlFor="cc-segment">Organisation type *</label>
                  <select id="cc-segment" name="segment" required defaultValue="">
                    <option value="">Select organisation type</option>
                    <option>Hospital / hospital group</option>
                    <option>Laboratory</option>
                    <option>Medical scheme / administrator</option>
                    <option>Public health institution</option>
                    <option>Technology / ecosystem partner</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="field full">
                  <label htmlFor="cc-message">What would you like to explore?</label>
                  <textarea id="cc-message" name="message" placeholder="Tell us briefly about your interest or challenge. Please do not include patient or health information." />
                </div>
              </div>
              <label className="consent-check">
                <input type="checkbox" required />
                <span>I agree that CLANCLAST may use these details to respond to this enquiry.</span>
              </label>
              <button className="btn" type="submit">Submit enquiry <span className="arrow">↗</span></button>
              <p className="form-note">Please do not include patient information.</p>
            </form>
          </div>
        </section>
      </div>

      <footer>
        <div className="wrap">
          <div className="footer-grid">
            <div className="footer-brand">
              <a className="brand" href="#home" aria-label="CLANCLAST home">
                <Logo height={34} surface="dark" />
              </a>
              <p>Federated healthcare trust and identity infrastructure. Connecting institutions without replacing their systems.</p>
            </div>
            <div className="footer-col"><strong>Explore</strong><a href="#platform">Platform</a><a href="#how">How it works</a><a href="#trust">Trust &amp; security</a><a href="#progress">Progress</a></div>
            <div className="footer-col"><strong>For institutions</strong><a href="#institutions">Hospitals</a><a href="#institutions">Laboratories</a><a href="#institutions">Medical schemes</a><a href="#contact">Request a briefing</a></div>
            <div className="footer-col"><strong>Company</strong><a href="#story">Our approach</a><a href="#trust">Commitments</a><a href="#prototype">Prototypes</a><a href="#contact">Contact</a></div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 CLANCLAST. All rights reserved.</span>
            <span>Built around trust · Designed for continuity</span>
          </div>
          <p className="disclaimer">This website describes a pre-pilot product. Product screens and workflow examples are illustrative and use fictional data. No accuracy, clinical outcome, adoption or saving is claimed as achieved. Photographs and graphics are illustrative.</p>
        </div>
      </footer>
    </div>
  );
}
