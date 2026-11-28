import type { ReactNode } from "react";
import { HeroMetalScales } from "../app/components/landing/HeroMetalScales";
import { brandPhotos as P } from "../app/components/landing/landingAssets";
import { Logo } from "../app/components/shared/Brand";
import { DemoPlayer } from "./DemoPlayer";

/**
 * The CLANCLAST pitch, built from the website's own sections (`.cc-site` styles).
 * Content follows Blueprint v5.0 (27 Nov 2026). Every figure is labelled as reported by a
 * third party, a CLANCLAST measurement, or a target (Canon Rule 5).
 */

export type Tone = "dark" | "light";
export type Slide = {
  id: string;
  nav?: string; // which nav link lights up
  title: string;
  seconds: number;
  tone: Tone;
  notes: string;
  backup?: boolean;
  body: ReactNode;
};

export const NAV = [
  ["problem", "Problem"],
  ["solution", "Solution"],
  ["demo", "Live demo"],
  ["why", "Why us"],
  ["market", "Market"],
  ["model", "Model"],
  ["impact", "Impact"],
  ["team", "Team"],
  ["ask", "Ask"],
] as const;

const Rv = ({ d = 0, children, className = "" }: { d?: number; children: ReactNode; className?: string }) => (
  <div className={`rv ${className}`} style={{ ["--d" as string]: `${d}ms` }}>{children}</div>
);

/* ------------------------------------------------------------------ 1. hero */
const Hero = (
  <section className="hero pg-hero">
    <div className="hero-bg" aria-hidden="true"><HeroMetalScales /><div className="hero-scrim" /></div>
    <div className="wrap hero-grid">
      <div className="hero-copy">
        <Rv><span className="eyebrow">The neutral switch for patient identity &amp; consent</span></Rv>
        <Rv d={120}><h1>No patient a stranger to their own <em>healthcare system.</em></h1></Rv>
        <Rv d={240}><p>South African healthcare has its banks, but no switch. Every system knows its own patients. None of them knows <b>the patient</b>.</p></Rv>
        <Rv d={480}>
          <div className="trust-mini">
            <span><i className="check">✓</i> No clinical records stored</span>
            <span><i className="check">✓</i> The patient decides</span>
            <span><i className="check">✓</i> Works offline and on basic phones</span>
          </div>
        </Rv>
      </div>
      <div className="hero-visual">
        <div className="visual-orbit" />
        <div className="hero-photo"><img src={P.doctorElderSmile.src} alt={P.doctorElderSmile.alt} /></div>
        <div className="float-tag one"><b>3 → 1</b>Records reconciled</div>
        <div className="float-tag two"><b>Offline-ready</b>Trust can travel</div>
        <div className="hero-panel merge-panel">
          <div className="panel-top">
            <span className="panel-brand">CLANCLAST <span style={{ color: "#2c8176" }}>/ MATCH</span></span>
            <span className="live">● A PERSON DECIDES</span>
          </div>
          <div className="merge">
            {[
              ["Thandiwe Mokoena", "Outpatients · ID on file"],
              ["Thandi Mokoena", "Clinic referral · no ID"],
              ["T. Mokoena", "Casualty, after hours"],
            ].map(([n, w], i) => (
              <div className="merge-rec" key={n} style={{ ["--i" as string]: i }}><b>{n}</b><small>{w}</small></div>
            ))}
            <div className="merge-one">
              <span className="merge-tick">✓</span>
              <div><b>Thandiwe Mokoena</b><small>CC-4821-1990 · 3 records linked · confirmed by staff</small></div>
            </div>
            <div className="merge-links">{["Outpatients", "Clinic referral", "Casualty"].map((x) => <span key={x}>✓ {x}</span>)}</div>
          </div>
          <div className="offline-card">
            <div className="offline-icon">⌁</div>
            <div><strong>Her summary verifies offline</strong><span>Signed by the hospital · carried by her · checked anywhere</span></div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ 2. problem */
const Problem = (
  <section className="section problem pg-problem">
    <div className="wrap problem-grid">
      <div className="problem-copy">
        <Rv><span className="eyebrow">Where care breaks</span></Rv>
        <Rv d={100}><h2>One woman. Three files. <em>None complete.</em></h2></Rv>
        <Rv d={200}><p>When an ID is missing, mistyped or never captured, or a name is spelled differently, each system registers her as someone new. Her history and her consent don’t follow her.</p></Rv>
        <div className="files">
          {[
            ["Lakeside Community Clinic", "Thandi Mokoena", "12-03-1990 · no ID · registered offline", "Allergy: penicillin"],
            ["Riverside General Hospital", "Thandiwe Mokoena", "12-03-1990 · 900312 0245 085", "New folder · history unknown"],
            ["Casualty, 02:40", "T. Mokoena", "01-01-1990 (estimated) · ID unreadable", "Allergy: not recorded"],
          ].map(([where, name, meta, note], i) => (
            <Rv d={320 + i * 140} key={where}>
              <div className={`file f${i}`}>
                <span className="file-tab">{where}</span>
                <b>{name}</b>
                <small>{meta}</small>
                <em>{note}</em>
              </div>
            </Rv>
          ))}
        </div>
        <Rv d={800}><p className="why-note">Not careless staff: the result of good choices, like working offline and treating everyone, in a system with no neutral layer to reconcile afterwards.</p></Rv>
      </div>
      <div className="stat-stack">
        {[
          ["437,342", "patients registered under the same ID number with different names (1.34%).", "NDoH, The Emerging SA Digital Health System, 2025"],
          ["1 in 10", "new registrations was a probable duplicate (2020). Only about 29% of records carry an SA ID.", "Western Cape PMI study, IJPDS 2023"],
          ["28%", "of clinic HIV lab results in Ekurhuleni could not be linked to the patient’s record.", "PLOS Global Public Health, July 2025"],
          ["R77bn", "in medico-legal claims. Eastern Cape cases settled because no record could be found.", "Auditor-General, September 2023"],
        ].map(([n, t, s], i) => (
          <Rv d={300 + i * 120} key={n}>
            <div className="stat"><strong>{n}</strong><p><span className="tag">Reported</span><br />{t}<span className="source">{s}</span></p></div>
          </Rv>
        ))}
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ 3. solution */
const Solution = (
  <section className="section thesis pg-solution">
    <div className="wrap thesis-grid">
      <div>
        <Rv><span className="eyebrow">The solution</span></Rv>
        <Rv d={100}><h2>Healthcare has the banks. <em>We built the switch.</em></h2></Rv>
        <Rv d={200}><p>CLANCLAST does for patient identity what a bank switch does for card payments: every organisation connects once, keeps its own records, and recognises the same person anywhere.</p></Rv>
        <div className="gap-list">
          {[
            ["HPRS · national register", "Public sector only"],
            ["NHIE · national exchange", "No patient consent service"],
            ["Hospital groups", "See only their own patients"],
            ["Medical schemes", "See only their own members"],
            ["CareConnect HIE", "Closed 2024: owned by competitors"],
          ].map(([a, b], i) => (
            <Rv d={320 + i * 80} key={a}><div className="gap"><b>{a}</b><span>{b}</span></div></Rv>
          ))}
        </div>
      </div>
      <Rv d={250} className="switch-wrap">
        <svg className="switch" viewBox="0 0 860 720" role="img" aria-label="Every system connects once to the CLANCLAST switch; the patient decides">
          <defs>
            <linearGradient id="sw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2c8176" /><stop offset="1" stopColor="#1d5f56" /></linearGradient>
          </defs>
          {[[107, "Public clinics", "HPRS and the NHIE"], [322, "Hospitals", "public and private"], [538, "Medical schemes", "members and claims"], [753, "GPs, pharmacies, labs", "their own systems"]].map(([x, t, s], i) => (
            <g key={t as string} className="node" style={{ ["--i" as string]: i }}>
              <path className="flow" d={`M${x} 118 C ${x} 190, 430 170, 430 262`} />
              <rect x={(x as number) - 98} y="24" width="196" height="94" rx="18" />
              <text x={x as number} y="64" className="nt">{t}</text>
              <text x={x as number} y="90" className="ns">{s}</text>
            </g>
          ))}
          <rect className="hub" x="150" y="262" width="560" height="250" rx="30" fill="url(#sw)" />
          <text x="430" y="312" className="ht">CLANCLAST · the neutral switch</text>
          {["Is this the same patient?  (evidence shown)", "May I see her history?  (she decides)", "Is this record real?  (signed, checks offline)"].map((q, i) => (
            <g key={q}><circle cx="196" cy={358 + i * 44} r="6" className="hd" /><text x="214" y={364 + i * 44} className="hq">{q}</text></g>
          ))}
          <text x="430" y="494" className="hs">Holds links, consent and audit only · never clinical records</text>
          <path className="flow up" d="M430 512 L430 588" />
          <rect className="pt" x="250" y="588" width="360" height="96" rx="20" />
          <text x="430" y="628" className="nt">The patient decides</text>
          <text x="430" y="656" className="ns">smartphone · basic phone (USSD) · at the desk</text>
        </svg>
      </Rv>
    </div>
  </section>
);

/* ------------------------------------------------------------------ 4. demo */
const Demo = (
  <section className="liveprod pg-demo">
    <div className="live-glow" aria-hidden="true" />
    <DemoPlayer />
  </section>
);

/* ------------------------------------------------------------------ 5. why us */
const Why = (
  <section className="section pg-why">
    <div className="wrap why-grid">
      <div>
        <Rv><span className="eyebrow">What’s new</span></Rv>
        <Rv d={100}><h2>Suggest, never merge. <em>Built for South Africa.</em></h2></Rv>
        <Rv d={200}><p>Matching patients isn’t new. A neutral, patient-controlled bridge between all of South Africa’s health systems is.</p></Rv>
        <div className="new-grid">
          {[
            ["01", "Neutral by design", "No hospital group, scheme, vendor or department owns the switch, so competitors can all connect."],
            ["02", "Recognise, don’t store", "Records stay with their owners. CLANCLAST holds the link, the consent and the audit trail."],
            ["03", "Suggest, never merge", "Possible matches arrive with their evidence. A person decides, and it can be undone."],
            ["04", "Built for SA records", "Works without ID numbers, reconciles offline capture, and handles SA naming patterns."],
            ["05", "Consent on any channel", "Smartphone, basic phone over USSD, or at the desk. No data bundle needed."],
            ["06", "Proven parts", "HL7 FHIR R4 and the IHE profiles the national exchange uses. Signed summaries verify offline."],
          ].map(([n, t, d], i) => (
            <Rv d={300 + i * 90} key={n}><div className="fallback"><div className="num">{n}</div><h3>{t}</h3><p>{d}</p></div></Rv>
          ))}
        </div>
      </div>
      <div className="why-side">
        <Rv d={250}>
          <div className="promise-card">
            <span className="eyebrow">Safety rules · because a wrong match can kill</span>
            <div className="never-list">
              {["Never auto-merge. Every link is logged and reversible.", "An SA ID whose birth date or sex doesn’t fit the record isn’t hers.", "A group can’t hold two valid IDs or birthdays a year apart.", "Same birthday, surname and household: possible twins, a person checks.", "Emergency access is logged, reviewed and the patient is told.", "No biometrics or facial recognition."].map((t) => (
                <div className="never" key={t}><span>✓</span>{t}</div>
              ))}
            </div>
          </div>
        </Rv>
        <Rv d={500}>
          <div className="moat">
            <b>Why it’s hard to copy</b>
            <div className="chips">{["Neutrality", "Network effect", "Local matching data", "Certification & trust"].map((c) => <span key={c}>{c}</span>)}</div>
          </div>
        </Rv>
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ 6. market */
const Market = (
  <section className="section audience pg-market">
    <div className="wrap market-grid">
      <div>
        <Rv><span className="eyebrow">Market &amp; why now</span></Rv>
        <Rv d={100}><h2>The demand is proven. <em>The neutral switch is missing.</em></h2></Rv>
        <Rv d={220}>
          <div className="proof">
            <span className="tag">Proof of demand · reported</span>
            <div className="proof-n"><b>5 million+</b><span>patients on CareConnect, the private sector’s own shared exchange</span></div>
            <div className="proof-n"><b>R100m+</b><span>invested by hospital groups and schemes, then closed in 2024 because it was owned by competitors</span></div>
            <p>BusinessDay, 17 July 2024 · Life Healthcare statement, 26 July 2024</p>
          </div>
        </Rv>
        <Rv d={360}>
          <div className="now">
            <b>Why now</b>
            {[["3,200+", "public facilities on HPRS, the national patient number"], ["2026", "the national health exchange (NHIE) is onboarding partners"], ["6 Mar 2026", "POPIA health-information regulations in force"]].map(([a, b]) => (
              <div key={a}><strong>{a}</strong><span>{b}</span></div>
            ))}
          </div>
        </Rv>
      </div>
      <Rv d={200}>
        <div className="audience-panel who">
          <div className="who-head"><h3>Who connects</h3><span className="tag">Reported counts</span></div>
          {[
            ["Public clinics", "3,474", "Reconcile offline and duplicate records with HPRS"],
            ["Public hospitals", "329", "Find a patient’s history across clinics"],
            ["Private hospitals", "200+", "Patients arrive from public care with no history"],
            ["Medical schemes", "~70", "Covering ~9m people. Duplicate members and claims"],
            ["GPs, pharmacies, labs", "Thousands", "Identity at the counter; results to the right patient"],
            ["Rest of Africa", "SADC", "The same switch on each country’s national health ID"],
          ].map(([a, n, w]) => (
            <div className="who-row" key={a}><b>{a}</b><strong>{n}</strong><span>{w}</span></div>
          ))}
          <p className="who-note">Minister of Health replies, HASA, Council for Medical Schemes. No rand market size is claimed until pricing is tested.</p>
        </div>
      </Rv>
    </div>
  </section>
);

/* ------------------------------------------------------------------ 7. business model */
const Model = (
  <section className="section pg-model">
    <div className="wrap">
      <div className="model-head">
        <div>
          <Rv><span className="eyebrow">Business model</span></Rv>
          <Rv d={100}><h2>Earns like a bank switch. <em>Patients never pay.</em></h2></Rv>
        </div>
        <Rv d={200}><p>No central record store to pay for, so every new connection adds income at little extra cost. That is where CareConnect, funded by six players, could not go.</p></Rv>
      </div>
      <div className="rev-grid">
        {[
          ["01", "Onboarding & clean-up", "Facilities, EHR vendors, implementers", "First: early cash"],
          ["02", "Annual connection fee", "Every participant, tiered by size", "As each one connects"],
          ["03", "Per-check fee", "Match · consent · verify, paid by the organisation asking", "Grows with the network"],
          ["04", "Public-sector contract", "Province or national programme, at cost", "Builds the network’s base"],
        ].map(([n, t, w, when], i) => (
          <Rv d={260 + i * 100} key={n}>
            <div className={`rev ${i === 2 ? "hot" : ""}`}><span className="rev-n">{n}</span><h3>{t}</h3><p>{w}</p><small>{when}</small></div>
          </Rv>
        ))}
      </div>
      <div className="model-foot">
        <Rv d={700}><div className="mf"><b>Who pays first</b><span>Medical schemes and private hospitals, who lose money to duplicate tests and claims today.</span></div></Rv>
        <Rv d={780}><div className="mf"><b>Go-to-market</b><span>National standards → one Nelson Mandela Bay facility → paying participants → other provinces and SADC.</span></div></Rv>
        <Rv d={860}><div className="mf never-mf"><b>Never</b><span>Charging patients, or selling or monetising identifiable patient data. Prices are tested with the first participants before any are quoted.</span></div></Rv>
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ 9. impact */
const Impact = (
  <section className="section pg-impact">
    <div className="wrap impact-grid">
      <div>
        <Rv><span className="eyebrow">Impact · smart city &amp; ICT</span></Rv>
        <Rv d={100}><h2>One less family forced to prove <em>who their loved one is.</em></h2></Rv>
        <Rv d={220}>
          <div className="big-target"><strong>2 million</strong><span>patients with a linked, consented identity by 2031</span><small className="tag">Target, not a forecast</small></div>
        </Rv>
        <div className="sdgs">
          {[["SDG 3.8", "Universal health coverage", "Care that follows the patient across public and private."], ["SDG 16.9", "Legal identity for all", "Recognised and able to consent without a perfect ID."], ["SDG 9.c", "Access to ICT", "Works offline, through load-shedding, on basic phones."]].map(([a, b, c], i) => (
            <Rv d={340 + i * 100} key={a}><div className="sdg"><b>{a}</b><h3>{b}</h3><p>{c}</p></div></Rv>
          ))}
        </div>
      </div>
      <Rv d={200} className="impact-side">
        <figure className="photo-card tall"><img src={P.womanLookingUp.src} alt={P.womanLookingUp.alt} /><figcaption>Illustrative photograph</figcaption></figure>
        <div className="benefit">
          {[["Patients", "Recognised anywhere, in control"], ["Staff", "Less searching, fewer duplicates"], ["Clinicians", "The right history at the point of care"], ["Health system", "Cleaner data for HPRS and NHI"]].map(([a, b]) => (
            <div key={a}><b>{a}</b><span>{b}</span></div>
          ))}
        </div>
      </Rv>
    </div>
  </section>
);

/* ------------------------------------------------------------------ 10. team */
const Team = (
  <section className="section pg-team">
    <div className="wrap team-grid">
      <div>
        <Rv><span className="eyebrow">Team &amp; progress</span></Rv>
        <Rv d={100}><h2>Three builders. <em>Already working, with no funding.</em></h2></Rv>
        <div className="people">
          {[["MT", "Martin Tlabela", "Founder & CEO", "IT, specialising in cyber security"], ["TM", "Thendo Mulaudzi", "CTO", "Computer science"], ["NT", "Nathaniel Tsumbe", "Engineering", "Computer science"]].map(([i, n, r, b], k) => (
            <Rv d={220 + k * 100} key={n}><div className="person"><span className="av">{i}</span><div><h3>{n}</h3><b>{r}</b><p>{b}</p></div></div></Rv>
          ))}
        </div>
        <div className="built">
          {[["3", "working products", "Provider platform, patient app with Summary Vault, operations console"], ["14,994", "record SA benchmark", "6,980 people, 2,520 look-alike traps, synthetic"], ["26 Nov", "NHIE request logged", "With the Department of Health, HIS Support portal"], ["80", "hospital staff surveyed", "About 75% say duplicates are a real problem"]].map(([n, t, d], k) => (
            <Rv d={560 + k * 90} key={t}><div className="b"><strong>{n}</strong><b>{t}</b><span>{d}</span></div></Rv>
          ))}
        </div>
        <Rv d={940}><p className="target">Proven standards (HL7 FHIR R4, the national exchange’s IHE profiles). <b>Target before claiming any accuracy result: 99%+ precision on automatic links.</b></p></Rv>
      </div>
      <div className="team-side">
        <Rv d={300}>
          <div className="with">
            <span className="eyebrow">Working with</span>
            {[["An experienced doctor in the field", "Her challenge to the earlier plan led to the safety rules and a first milestone that needs no patient data."], ["The Batsamayi founder", "In conversation about technical leadership and strategic partnerships."], ["Propella Business Incubator", "Mentorship and investor readiness."]].map(([a, b]) => (
              <div key={a}><b>{a}</b><p>{b}</p></div>
            ))}
          </div>
        </Rv>
        <Rv d={460}>
          <div className="gaps"><b>Gaps, and how they close</b><p>A senior technical lead (funded in Stage 1), a clinical safety lead before any pilot, and POPIA legal advice. Founder agreement, vesting and IP assignment signed before external funding.</p></div>
        </Rv>
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ 11. ask */
const Ask = (
  <section className="section progress pg-ask">
    <div className="wrap">
      <div className="ask-head">
        <div>
          <Rv><span className="eyebrow">The ask</span></Rv>
          <Rv d={100}><h2><span className="ask-n">R900,000</span> over 16 months, <em>released on evidence.</em></h2></Rv>
        </div>
        <Rv d={200}><p>Product development, identity-match validation, an independent security review, legal and compliance work, and a structured pilot. Each stage unlocks only when the last one delivers.</p></Rv>
      </div>
      <div className="stage-grid">
        {[
          ["Stage 1 · months 1–4", "Validate", "R250,000", ["NHIE test-environment conformance", "Engine tuned and scored on the SA benchmark", "Senior technical lead"], "Gate: conformance passed, 99%+ automatic precision"],
          ["Stage 2 · months 5–9", "Secure & comply", "R300,000", ["Independent security review and penetration test", "POPIA legal opinion", "Research ethics approval · facility data agreement"], "Gate: security and ethics approved, facility signed"],
          ["Stage 3 · months 10–16", "Prove", "R350,000", ["Structured pilot with one Nelson Mandela Bay facility", "Duplicates prevented and time saved, measured", "Results published"], "Result: proven pilot, first paying participants"],
        ].map(([when, t, amt, items, gate], i) => (
          <Rv d={300 + i * 140} key={t as string}>
            <div className={`stage ask-stage ${i === 0 ? "current" : ""}`}>
              <div className="status">{when as string}</div>
              <div className="ask-row"><h3>{t as string}</h3><strong>{amt as string}</strong></div>
              <ul>{(items as string[]).map((x) => <li key={x}>{x}</li>)}</ul>
              <div className="gate">{gate as string}</div>
            </div>
          </Rv>
        ))}
      </div>
      <div className="ask-foot">
        <Rv d={800}><p className="ask-line">Your money moves with evidence, not promises.</p></Rv>
        <Rv d={900}><div className="ask-cta"><Logo height={34} surface="dark" /><span>No patient should be a stranger to their own healthcare system.</span></div></Rv>
      </div>
      <Rv d={1000}><p className="ask-small">Proposed split; final amounts follow the detailed budget. CIPC, SARS tax compliance, CSD and B-BBEE documents are completed before any funds are drawn.</p></Rv>
    </div>
  </section>
);

/* ------------------------------------------------------------------ backups */
const QA = (eyebrow: string, title: ReactNode, rows: [string, string][], note?: string) => (
  <section className="section pg-qa">
    <div className="wrap">
      <Rv><span className="eyebrow">Questions · {eyebrow}</span></Rv>
      <Rv d={100}><h2>{title}</h2></Rv>
      <div className="qa-list">
        {rows.map(([a, b], i) => <Rv d={200 + i * 70} key={a}><div className="qa"><b>{a}</b><span>{b}</span></div></Rv>)}
      </div>
      {note && <Rv d={700}><p className="qa-note">{note}</p></Rv>}
    </div>
  </section>
);

export const SLIDES: Slide[] = [
  { id: "home", title: "No patient a stranger", seconds: 15, tone: "dark", body: Hero,
    notes: "Meet Thandi. She has been to a clinic, a hospital and casualty, and the health system now thinks she is three different people. CLANCLAST makes sure no patient is a stranger to their own healthcare system." },
  { id: "problem", nav: "problem", title: "The problem", seconds: 30, tone: "light", body: Problem,
    notes: "When an ID is missing or a name is spelled differently, each system registers her as someone new: Thandi, Thandiwe, T. Mokoena. One person, three files, none complete. The Department of Health itself found over 437,000 patients under one ID with different names; in the Western Cape about one in ten new registrations was a probable duplicate. And it isn't careless staff. It's good choices, like working offline and treating everyone, with nothing to reconcile the records afterwards. [Confirm the exact wording of the 437,342 figure in the NDoH 2025 book.]" },
  { id: "solution", nav: "solution", title: "The solution", seconds: 25, tone: "dark", body: Solution,
    notes: "Every existing system covers part of the picture: HPRS is public only, the national exchange has no consent service, hospital groups and schemes see only their own people. The private sector's own exchange, CareConnect, closed because competitors owned it. CLANCLAST is the neutral switch. Every organisation connects once and keeps its own records. The switch answers three questions: is this the same patient, may I see her history, and is this record real. And the patient decides, on any phone." },
  { id: "demo", nav: "demo", title: "Live demo", seconds: 110, tone: "dark", body: Demo,
    notes: "This is the working product, not a mockup. Chapter one: Riverside's register has Thandi three times. The engine finds the possible matches and shows its evidence; it never merges on its own. A staff member confirms. Three files, one Thandi. Chapter two: the hospital asks for her history; the request lands on her phone; she allows it for seven days, and it's logged on both sides. Chapter three: the hospital signs a summary she carries. The network goes down, and another desk can still verify it's genuine. Press → to move to the next chapter; Space pauses." },
  { id: "why", nav: "why", title: "What's new", seconds: 20, tone: "light", body: Why,
    notes: "Matching patients isn't new. A neutral, patient-controlled bridge across all of South Africa's systems is. We recognise, we don't store; we suggest, we never merge; and we're built for South African records, without ID numbers and with offline capture. Because a wrong match can kill someone, safety comes first: ID-to-birth-date checks, group conflict rules, a twin rule, and no biometrics. It's hard to copy because an incumbent can never be neutral." },
  { id: "market", nav: "market", title: "Market and why now", seconds: 20, tone: "light", body: Market,
    notes: "The demand has already been paid for: hospital groups and schemes put over 100 million rand into CareConnect and reached 5 million patients, before it closed because it was owned by competitors. Now HPRS is in over 3,200 facilities, the national exchange is onboarding partners, and POPIA's health regulations took effect this March. Who connects: 3,474 public clinics, 329 public hospitals, 200 private hospitals, about 70 schemes." },
  { id: "model", nav: "model", title: "Business model", seconds: 15, tone: "light", body: Model,
    notes: "We earn like a bank switch: organisations pay to connect and pay a small fee per check: match, consent, verify. Patients never pay, and we never sell data. Schemes and private hospitals pay first, because duplicates cost them money today. Prices will be tested with the first participants." },
  { id: "impact", nav: "impact", title: "Impact", seconds: 15, tone: "light", body: Impact,
    notes: "Every patient we connect is one less family forced to prove, again and again, who their loved one is. Our target is two million patients by 2031. It serves universal health coverage, legal identity for all, and works offline, through load-shedding, on a basic phone." },
  { id: "team", nav: "team", title: "Team and progress", seconds: 25, tone: "light", body: Team,
    notes: "With no funding we've built three working products, a 14,994-record South African benchmark full of look-alike traps, and we've lodged our connection request with the national exchange. We hold ourselves to a 99% precision target before we claim any accuracy result. We're three computing students: cyber security and computer science. We shipped before raising a cent, and we're adding what we lack: an experienced doctor challenged our plan, we're talking to the Batsamayi founder about technical leadership, and Propella is mentoring us. [Add one sentence, in your own words, on why this matters to you.] [Confirm surname for all materials: Tlabela or Mamoloto; and name order for Nathaniel Tsumbe.]" },
  { id: "ask", nav: "ask", title: "The ask", seconds: 25, tone: "dark", body: Ask,
    notes: "We're asking for R900,000 over 16 months, released in three stages, each unlocked only by evidence: validate, then secure and comply, then prove it in one Nelson Mandela Bay facility. Your money moves with evidence, not promises. No patient should be a stranger to their own healthcare system. Thank you." },
  { id: "q-accuracy", title: "Q: How accurate is it?", seconds: 0, tone: "light", backup: true,
    notes: "Be straight: the engine is being tuned. Give the best run, the fixes since, and the 99% target before any claim. Never quote an accuracy figure as a result.",
    body: QA("accuracy, honestly", <>We measure. <em>We don’t claim.</em></>, [
      ["Best run so far", "79.1% automatic precision and 88.4% recall on the labelled subset of our 14,994-record synthetic benchmark (platform’s own scoring). A simple fuzzy baseline: 95.5% precision, 66.5% recall."],
      ["Fixes since", "SA ID checked against the record’s birth date and sex; conflict rules applied to whole groups; a twin rule; the score display fixed. Re-scoring against the full answer key next."],
      ["Target before any claim", "At least 99% precision on automatic links. Everything uncertain goes to a person with the evidence."],
      ["Then real records", "Staff label a random, blinded sample of pairs; we report precision and recall with confidence ranges. Only after ethics approval and a data agreement."],
    ], "Measured on synthetic data. Real-world accuracy is measured with a pilot facility’s own staff.") },
  { id: "q-privacy", title: "Q: Privacy and POPIA", seconds: 0, tone: "light", backup: true,
    notes: "We store no clinical records: links, consent and audit only. The facility is the responsible party; we are its operator. Synthetic data until ethics approval. Two open legal questions go to a POPIA lawyer before any pilot.",
    body: QA("privacy & POPIA", <>We hold <em>what we choose not to hold.</em></>, [
      ["No clinical records", "Data is minimised to links, consent and audit. Health information is special personal information under POPIA, regulated since 6 March 2026."],
      ["Roles", "In pilots the facility is the responsible party and CLANCLAST its operator, under a signed data-processing agreement."],
      ["Synthetic first", "No real patient data before research ethics approval and a data agreement. Immigration status is never recorded or exposed."],
      ["Open legal questions", "Whether cross-organisation linkage needs the Information Regulator’s prior authorisation, and how clinical liability is split. Both go to a POPIA lawyer before any pilot."],
    ]) },
  { id: "q-risk", title: "Q: Risks", seconds: 0, tone: "light", backup: true,
    notes: "The biggest risk is the one that closed CareConnect: running out of money before enough participants connect. We start where a single participant gets value alone, and the money is staged.",
    body: QA("risks", <>The risk that closed CareConnect <em>is the one we plan for.</em></>, [
      ["Network doesn’t form in time", "Start where one participant gets value alone; staged funding; low running costs."],
      ["A wrong match harms a patient", "Never auto-merge; 99%+ target; ID, group and twin rules; human review; clinical safety lead and indemnity before pilots."],
      ["Seen as competing with HPRS or NHI", "Built on HPRS, links to the national patient number, uses national standards. NHI is upside, not the base case."],
      ["Incumbents build their own matching", "They can match inside their systems, not across competitors. We partner with them as a channel."],
      ["Government access is slow", "Stage 1 continues on synthetic data; Eastern Cape and CSIR as sponsors; private participants in parallel."],
    ]) },
];

export const MAIN = SLIDES.filter((s) => !s.backup);
export const TOTAL = MAIN.reduce((n, s) => n + s.seconds, 0);
