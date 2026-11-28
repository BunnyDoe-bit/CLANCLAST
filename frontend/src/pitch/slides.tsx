import type { ReactNode } from "react";
import { HeroMetalScales } from "../app/components/landing/HeroMetalScales";
import { brandPhotos as P } from "../app/components/landing/landingAssets";
import { Logo } from "../app/components/shared/Brand";
import { DemoClip, DemoPlayer } from "./DemoPlayer";
import { QrCode } from "./qr";

/**
 * The CLANCLAST pitch: a 3-minute, ten-slide deck built from the website's own sections (`.cc-site` styles).
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
  bare?: boolean; // full screen, no header
  body: ReactNode;
};

export const NAV = [
  ["problem", "Problem"],
  ["switch", "Switch"],
  ["demo", "Product"],
  ["demand", "Demand"],
  ["model", "Model"],
  ["proof", "Proof"],
  ["impact", "Impact"],
  ["ask", "Ask"],
] as const;

const Rv = ({ d = 0, children, className = "" }: { d?: number; children: ReactNode; className?: string }) => (
  <div className={`rv ${className}`} style={{ ["--d" as string]: `${d}ms` }}>{children}</div>
);

/** Address for "try it yourself" on the closing slide. Leave empty to show the line only; set it to add a QR code. */
export const LIVE_URL: string = "";

/* ------------------------------------------------------------------ 1. the question */
const Question = (
  <section className="pg-q">
    <div className="hero-bg" aria-hidden="true"><HeroMetalScales /><div className="hero-scrim q-scrim" /></div>
    <div className="wrap q-wrap">
      <Rv d={200}><h1 className="q">What if one of the barriers to healthcare isn’t the treatment itself, but the system’s <em>inability to recognise the patient in front of it?</em></h1></Rv>
    </div>
  </section>
);

/* ------------------------------------------------------------------ 2. one woman, three files */
const Files = (
  <section className="section problem pg-files">
    <div className="wrap">
      <Rv><h2 className="big">One woman. Three files. <em>None complete.</em></h2></Rv>
      <div className="files big-files">
        {[
          ["Lakeside Community Clinic", "Thandi Mokoena", "No ID · registered offline", "Allergy: penicillin"],
          ["Riverside General Hospital", "Thandiwe Mokoena", "ID on file · new folder", "History: unknown"],
          ["Casualty, 02:40", "T. Mokoena", "Birthday guessed: 1 January", "Allergy: not recorded"],
        ].map(([where, name, meta, note], i) => (
          <Rv d={700 + i * 900} key={where}>
            <div className={`file f${i}`}><span className="file-tab">{where}</span><b>{name}</b><small>{meta}</small><em>{note}</em></div>
          </Rv>
        ))}
      </div>
      <div className="two-stats">
        <Rv d={3600}><div className="bs"><strong>1 in 10</strong><span>new clinic registrations was a probable duplicate</span><small>Western Cape PMI study, IJPDS 2023 · reported</small></div></Rv>
        <Rv d={3900}><div className="bs"><strong>437,342</strong><span>patients under one ID number with different names</span><small>National Department of Health, 2025 · reported</small></div></Rv>
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ 3. the switch */
const Switch = (
  <section className="section thesis pg-switch">
    <div className="wrap switch-grid">
      <div>
        <Rv><h2 className="big">Healthcare has the banks. <em>It&nbsp;has&nbsp;no&nbsp;switch.</em></h2></Rv>
        <Rv d={300}><p className="lead">CLANCLAST is that switch. Every system connects once and keeps its own records.</p></Rv>
        <div className="rules">
          {["Recognise, don’t store", "Suggest, never merge", "The patient decides"].map((t, i) => <Rv d={600 + i * 150} key={t}><span>{t}</span></Rv>)}
        </div>
      </div>
      <Rv d={250} className="switch-wrap">
        <svg className="switch" viewBox="0 0 860 720" role="img" aria-label="Clinics, hospitals, schemes and pharmacies connect once to the CLANCLAST switch; the patient decides">
          <defs><linearGradient id="sw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2c8176" /><stop offset="1" stopColor="#1d5f56" /></linearGradient></defs>
          {[[107, "Clinics"], [322, "Hospitals"], [538, "Schemes"], [753, "Pharmacies"]].map(([x, t], i) => (
            <g key={t as string} className="node" style={{ ["--i" as string]: i }}>
              <path className="flow" d={`M${x} 118 C ${x} 190, 430 170, 430 262`} />
              <rect x={(x as number) - 98} y="38" width="196" height="80" rx="18" />
              <text x={x as number} y="88" className="nt big">{t}</text>
            </g>
          ))}
          <rect className="hub" x="150" y="262" width="560" height="236" rx="30" fill="url(#sw)" />
          <text x="430" y="318" className="ht">CLANCLAST</text>
          {["Same patient?", "May I see her history?", "Is this record real?"].map((q, i) => (
            <g key={q}><circle cx="236" cy={366 + i * 44} r="7" className="hd" /><text x="256" y={374 + i * 44} className="hq big">{q}</text></g>
          ))}
          <path className="flow up" d="M430 498 L430 588" />
          <rect className="pt" x="230" y="588" width="400" height="92" rx="20" />
          <text x="430" y="644" className="nt big">Her phone decides</text>
        </svg>
      </Rv>
    </div>
  </section>
);

/* ------------------------------------------------------------------ 4. the demo */
const Clip = (
  <section className="pg-clip">
    <DemoClip />
  </section>
);

/* ------------------------------------------------------------------ 5. the demand */
const Paid = (
  <section className="section pg-paid">
    <div className="wrap">
      <Rv><h2 className="big">The demand has <em>already been paid for.</em></h2></Rv>
      <div className="paid-row">
        <Rv d={300}><div className="huge"><strong>R100m+</strong><span>invested by hospital groups and schemes in CareConnect</span></div></Rv>
        <Rv d={500}><div className="huge"><strong>5m+</strong><span>patients on it, before it closed in 2024</span></div></Rv>
        <Rv d={700}><div className="huge dark"><strong>Why it closed</strong><span>It was owned by competitors. A switch has to be neutral.</span></div></Rv>
      </div>
      <Rv d={1000}>
        <div className="who-line">
          {[["3,474", "public clinics"], ["329", "public hospitals"], ["200+", "private hospitals"], ["~70", "medical schemes"]].map(([n, t]) => <div key={t}><strong>{n}</strong><span>{t}</span></div>)}
        </div>
      </Rv>
      <Rv d={1100}><p className="src">Reported: BusinessDay and Life Healthcare, July 2024; Minister of Health, HASA, Council for Medical Schemes.</p></Rv>
    </div>
  </section>
);

/* ------------------------------------------------------------------ 6. the model */
const Earn = (
  <section className="section pg-earn">
    <div className="wrap">
      <Rv><h2 className="big">Earns like a <em>bank switch.</em></h2></Rv>
      <div className="earn-row">
        {[["Pay to connect", "Every hospital, clinic and scheme"], ["Pay per check", "Match · consent · verify"], ["Patients never pay", "And their data is never sold"]].map(([a, b], i) => (
          <Rv d={300 + i * 200} key={a}><div className={`earn ${i === 2 ? "dark" : ""}`}><strong>{a}</strong><span>{b}</span></div></Rv>
        ))}
      </div>
      <Rv d={1000}><p className="lead dark-ink">Schemes and private hospitals pay first: duplicates cost them money today.</p></Rv>
    </div>
  </section>
);

/* ------------------------------------------------------------------ 7. proof this week */
const Proof = (
  <section className="section progress pg-proof">
    <div className="wrap">
      <Rv><h2 className="big">In the last 7 days, <em>the numbers moved.</em></h2></Rv>
      <div className="proof-row">
        <Rv d={300}><div className="pf main"><strong>136 → 0</strong><span>automatic links that joined people with impossible birthdays</span><small>Measured on our 14,994-record South African benchmark · synthetic data</small></div></Rv>
        <Rv d={600}><div className="pf"><strong>26 Nov</strong><span>application lodged with the national health exchange</span></div></Rv>
        <Rv d={800}><div className="pf"><strong>3</strong><span>working products, live on fictional data</span></div></Rv>
      </div>
      <Rv d={1100}><p className="lead">Next target, before we claim any accuracy result: <b>99%+ precision</b> on automatic links.</p></Rv>
    </div>
  </section>
);

/* ------------------------------------------------------------------ 8. impact, and the people behind it */
const Family = (
  <section className="section pg-family">
    <div className="wrap family-grid">
      <div>
        <Rv><h2 className="big">One less family forced to prove <em>who their loved one is.</em></h2></Rv>
        <Rv d={300}><div className="target-line"><strong>2 million</strong><span>patients with a linked, consented identity by 2031</span><small className="tag">Target</small></div></Rv>
        <Rv d={600}><div className="sdg-line">{["SDG 3 · health for all", "SDG 16 · legal identity", "SDG 9 · works offline, on basic phones"].map((t) => <span key={t}>{t}</span>)}</div></Rv>
      </div>
      <Rv d={400}>
        <div className="crew">
          <span className="eyebrow">Built by</span>
          {[["Martin Tlabela", "Founder & CEO · cyber security"], ["Thendo Mulaudzi", "CTO · computer science"], ["Nathaniel Tsumbe", "Engineering · computer science"]].map(([n, r]) => (
            <div key={n}><b>{n}</b><span>{r}</span></div>
          ))}
        </div>
      </Rv>
    </div>
  </section>
);

/* ------------------------------------------------------------------ 9. the ask */
const AskNow = (
  <section className="section progress pg-ask2">
    <div className="wrap">
      <Rv><h2 className="big"><span className="ask-n">R900,000</span>, released <em>on evidence.</em></h2></Rv>
      <div className="steps3">
        {[["1", "Validate", "R250k", "99%+ precision · national exchange tested"], ["2", "Secure & comply", "R300k", "Security review · POPIA · ethics"], ["3", "Prove", "R350k", "Pilot in one Nelson Mandela Bay facility"]].map(([n, t, a, g], i) => (
          <Rv d={300 + i * 200} key={n}><div className={`s3 ${i === 0 ? "on" : ""}`}><span className="s3n">{n}</span><b>{t}</b><strong>{a}</strong><p>{g}</p></div></Rv>
        ))}
      </div>
      <Rv d={1000}><p className="ask-say">Your money moves with evidence, not promises.</p></Rv>
    </div>
  </section>
);

/* ------------------------------------------------------------------ 10. the closing line */
const Close = (
  <section className="pg-close">
    <div className="hero-bg" aria-hidden="true"><HeroMetalScales /><div className="hero-scrim q-scrim" /></div>
    <div className="wrap close-wrap">
      <Rv d={200}><Logo height={58} surface="dark" /></Rv>
      <Rv d={500}><h1 className="q close-line">No patient should be a stranger to <em>their own healthcare system.</em></h1></Rv>
      <Rv d={1400}>
        <div className="live-line">
          {LIVE_URL && <QrCode text={LIVE_URL} />}
          <p>Everything you’ve just seen is live. <b>Try it yourself after this session{LIVE_URL ? `: ${LIVE_URL.replace(/^https?:\/\//, "")}` : "."}</b></p>
        </div>
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
  { id: "q", title: "The question", seconds: 8, tone: "dark", bare: true, body: Question,
    notes: "[Stand still. Say it slowly.] What if one of the barriers to healthcare isn't the treatment itself, but the system's inability to recognise the patient in front of it? [Two seconds of silence. Then click.]" },
  { id: "problem", nav: "problem", title: "One woman. Three files.", seconds: 25, tone: "light", body: Files,
    notes: "Meet Thandi. At a clinic she's Thandi Mokoena, no ID, registered offline. At the hospital she's Thandiwe. In casualty at 2am she's T. Mokoena, birthday guessed. One woman, three files, none complete, and the penicillin allergy lives in only one of them. This isn't rare: in the Western Cape about one in ten new registrations was a probable duplicate, and the Department of Health found over 437,000 patients under one ID with different names." },
  { id: "switch", nav: "switch", title: "The switch", seconds: 20, tone: "dark", body: Switch,
    notes: "Healthcare has the banks. It has no switch. Every hospital, clinic and scheme knows its own patients; none of them knows the patient. CLANCLAST is that switch: every system connects once and keeps its own records. We recognise, we don't store. We suggest, we never merge. And the patient decides." },
  { id: "demo", nav: "demo", title: "The product", seconds: 35, tone: "dark", body: Clip,
    notes: "This is the working product. Riverside's register has Thandi three times. The engine shows its evidence: same birthday, Thandi is short for Thandiwe. A person confirms. Three files, one Thandi. The hospital asks to see her history, and the request lands on her phone. She allows it for seven days. Then the network goes down, load-shedding, and another desk still verifies her summary is genuine. [Space pauses the video.]" },
  { id: "demand", nav: "demand", title: "The demand", seconds: 15, tone: "light", body: Paid,
    notes: "And the demand has already been paid for. South Africa's hospital groups and schemes put over 100 million rand into CareConnect and reached five million patients. It closed in 2024 because competitors owned it. A switch has to be neutral. That's us." },
  { id: "model", nav: "model", title: "The model", seconds: 12, tone: "light", body: Earn,
    notes: "We earn like a bank switch: organisations pay to connect and pay per check. Patients never pay, and their data is never sold. Schemes and private hospitals pay first, because duplicates cost them money today." },
  { id: "proof", nav: "proof", title: "Proof this week", seconds: 18, tone: "dark", body: Proof,
    notes: "And we move fast. In the last seven days, on our 14,994-record South African benchmark, automatic links that joined people with impossible birthdays went from 136 to zero. We lodged our application with the national health exchange on the 26th. Next target: 99% precision before we claim any accuracy figure." },
  { id: "impact", nav: "impact", title: "Why we build this", seconds: 20, tone: "light", body: Family,
    notes: "[YOUR FATHER'S STORY: one or two sentences, in your own words.] That's why we build this. Every patient we connect is one less family forced to prove, again and again, who their loved one is. Our target: two million patients by 2031. We're Martin, Thendo and Nathaniel, and we built all of this with no funding." },
  { id: "ask", nav: "ask", title: "The ask", seconds: 20, tone: "dark", body: AskNow,
    notes: "We're asking for R900,000 over 16 months, released in three stages: validate, secure and comply, then prove it in one Nelson Mandela Bay facility. Each stage unlocks only when the last one delivers. Your money moves with evidence, not promises." },
  { id: "close", title: "Closing line", seconds: 7, tone: "dark", bare: true, body: Close,
    notes: "No patient should be a stranger to their own healthcare system. [Pause.] Everything you've just seen is live. After this session, try it yourself. Thank you." },

  { id: "walkthrough", title: "Backup: the full walkthrough", seconds: 0, tone: "dark", backup: true, body: Demo,
    notes: "If they want to see more: three full chapters recorded on the product, plus both apps live (chapter 4, needs the site online). → moves between chapters." },
  { id: "b-safety", title: "Backup: what's new and the safety rules", seconds: 0, tone: "light", backup: true, body: Why,
    notes: "Six things that are new, and the safety rules. A wrong match can kill, so: never auto-merge, ID checked against birth date and sex, group conflict rule, twin rule, emergency access logged, no biometrics." },
  { id: "b-market", title: "Backup: market and why now", seconds: 0, tone: "light", backup: true, body: Market,
    notes: "Who connects, with reported counts, and why now: HPRS in 3,200+ facilities, the national exchange onboarding partners, POPIA health regulations in force since 6 March 2026." },
  { id: "q-accuracy", title: "Q: How accurate is it?", seconds: 0, tone: "light", backup: true,
    notes: "Be straight: the engine is being tuned. Give the best run, the fixes since, and the 99% target before any claim. Never quote an accuracy figure as a result.",
    body: QA("accuracy, honestly", <>We measure. <em>We don’t claim.</em></>, [
      ["Best run so far", "79.1% automatic precision and 88.4% recall on the labelled subset of our 14,994-record synthetic benchmark (platform’s own scoring). A simple fuzzy baseline: 95.5% precision, 66.5% recall."],
      ["Fixes this week", "SA ID checked against the record’s birth date and sex; conflict rules applied to whole groups; a twin rule. On the same 14,994 records, automatically linked groups joining impossible birthdays went from 136 (21 Nov engine) to 0. That counts provable errors only; it is not a precision figure."],
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
