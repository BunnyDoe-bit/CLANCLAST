import type { ReactNode } from "react";
import reception from "../assets/landing/photo-reception-desk-scene.webp";
import elder from "../assets/landing/brand-doctor-elder-smile.webp";
import { DemoReel } from "./DemoReel";

/**
 * The ProFuture pitch: 10 slides for a 5-minute slot, then backup slides for questions.
 * Order follows the Pitch Canvas; time follows the judging weights (problem, innovation and
 * feasibility carry 15% each, so they get the most time). Notes are the spoken script.
 */
export type Slide = { id: string; title: string; seconds: number; tone: "dark" | "light"; notes: string; body: ReactNode; backup?: boolean };

const Check = () => <span className="ck" aria-label="yes">✓</span>;
const No = () => <span className="no" aria-label="no">–</span>;

export const SLIDES: Slide[] = [
  {
    id: "open", title: "No patient a stranger", seconds: 20, tone: "dark",
    notes: "Good morning. Imagine arriving at a clinic sick, and nobody can tell who you are, what you're allergic to, or what was done for you last week across town. That happens every day in South Africa. We're CLANCLAST, and we make sure no patient is a stranger to their own healthcare system.",
    body: (
      <div className="s-open">
        <img className="logo" src="/brand/clanclast-horizontal-on-dark.svg" alt="CLANCLAST" />
        <h1>No patient a stranger to their own <em>healthcare system.</em></h1>
        <p className="lede">Identity, consent and trusted health summaries that move with people, across every clinic and hospital, even without a network.</p>
        <p className="foot">ProFuture cohort · Smart City / ICT · Health</p>
      </div>
    ),
  },
  {
    id: "pain", title: "The pain", seconds: 40, tone: "light",
    notes: "Here's the problem. Thandi visits three facilities in a year. She gets three folders and three numbers, and the record of her penicillin allergy stays in the first one. Clinics can't tell that these are the same person, so staff re-register her, repeat tests, and sometimes miss what matters. Multiply that across the public system that most South Africans rely on. It costs money, time and, in the worst case, lives. The figures here are reported national estimates.",
    body: (
      <div className="s-pain">
        <div className="story">
          <span className="eyebrow">The pain</span>
          <h2>One patient. Three clinics. <em>Three strangers.</em></h2>
          <ol className="folders">
            <li><b>Clinic A</b><span>“Thandiwe Mokoena” · 1990-03-12 · allergy: penicillin</span></li>
            <li><b>Hospital B</b><span>“Thandi Mokoena” · no ID · new folder</span></li>
            <li><b>Clinic C</b><span>“T. Mokoena” · 1990-01-01 (estimated) · allergy: unknown</span></li>
          </ol>
          <p className="so">Duplicate folders, repeated tests, missed allergies, and long queues while staff search.</p>
        </div>
        <div className="side">
          <img src={reception} alt="" />
          <div className="stats">
            <div><strong>R30bn</strong><span>a year lost to healthcare fraud, waste and abuse</span></div>
            <div><strong>R76bn</strong><span>public-sector medico-legal contingent liability, 2023/24</span></div>
            <div><strong>122–209 min</strong><span>public clinic waiting times, against a 120-minute target</span></div>
          </div>
          <p className="src">Reported: BHF/SIU (2026), National Treasury Budget Review (2025), SAMJ / Gauteng DoH. Context, not CLANCLAST outcomes.</p>
        </div>
      </div>
    ),
  },
  {
    id: "solution", title: "How it works", seconds: 30, tone: "light",
    notes: "CLANCLAST is a thin trust layer that sits beside the systems clinics already use. Three things. One: we find the same person across messy records, and a person decides anything uncertain. Two: the patient controls who sees what, from an app, a basic phone or a caregiver. Three: clinics sign a short summary the patient carries, and any clinic can check it's genuine, even offline. We never store clinical records.",
    body: (
      <div className="s-solution">
        <span className="eyebrow">The product</span>
        <h2>A thin trust layer beside the systems clinics already use.</h2>
        <div className="three">
          <div><span className="n">1</span><h3>Identify</h3><p>Finds the same person across messy records: typos, nicknames, swapped names, a parent’s ID on a child’s file. Uncertain cases go to a person.</p></div>
          <div><span className="n">2</span><h3>Consent</h3><p>The patient decides who sees what, and for how long: in the app, by USSD on any phone, or through a caregiver.</p></div>
          <div><span className="n">3</span><h3>Verify, even offline</h3><p>Clinics sign a short summary the patient carries. Any clinic can check it’s genuine and unchanged with no network.</p></div>
        </div>
        <p className="rule">CLANCLAST holds no clinical records. Institutions keep their systems; patients keep control.</p>
      </div>
    ),
  },
  {
    id: "demo", title: "Working product", seconds: 55, tone: "dark",
    notes: "This is the working product: real screens, not mock-ups. At the front desk, staff find Thandiwe without creating a second folder. The clinic asks for her emergency summary. On her phone, she sees exactly who is asking and why, and allows it for seven days. The clinic sees the approval immediately. Then the clinic signs her summary, and it lands in her phone's encrypted vault, with the signature verified. You can try all of this after the session on our laptop.",
    body: <DemoReel />,
  },
  {
    id: "unique", title: "What’s unique", seconds: 30, tone: "light",
    notes: "How is this different? Hospital systems and master patient indexes only see their own records. A national ID lookup fails for the millions without a usable ID, and for children on a parent's ID. Paper doesn't travel. We work across institutions, without holding records, with consent the patient controls, offline, and for people without smartphones. And no automatic merge ever happens on a guess: uncertain matches go to a person.",
    body: (
      <div className="s-unique">
        <span className="eyebrow">What’s unique</span>
        <h2>Built for how South African records really look.</h2>
        <table className="compare">
          <thead><tr><th /><th className="us">CLANCLAST</th><th>Hospital system / MPI</th><th>National ID lookup</th><th>Paper folders</th></tr></thead>
          <tbody>
            <tr><td>Works across institutions</td><td className="us"><Check /></td><td><No /></td><td><Check /></td><td><No /></td></tr>
            <tr><td>Handles missing, borrowed or mistyped IDs</td><td className="us"><Check /></td><td><No /></td><td><No /></td><td><No /></td></tr>
            <tr><td>Patient controls consent</td><td className="us"><Check /></td><td><No /></td><td><No /></td><td><No /></td></tr>
            <tr><td>Verifiable offline</td><td className="us"><Check /></td><td><No /></td><td><No /></td><td><Check /></td></tr>
            <tr><td>No smartphone needed (USSD, caregiver)</td><td className="us"><Check /></td><td><No /></td><td><No /></td><td><Check /></td></tr>
            <tr><td>Holds no clinical records</td><td className="us"><Check /></td><td><No /></td><td><Check /></td><td><No /></td></tr>
          </tbody>
        </table>
        <p className="note">A person decides every uncertain match. Nothing is merged automatically on a guess.</p>
      </div>
    ),
  },
  {
    id: "proof", title: "Proof so far", seconds: 30, tone: "light",
    notes: "What have we proven? We built the whole platform: a patient app, a provider workspace and an admin console, all running. We tested the identity engine against more than forty thousand labelled synthetic records designed to be hard: South African name variants, typos, twins and borrowed IDs. It made zero wrong automatic links. With staff review it finds 99.5 percent of duplicates on a realistic file, and nearly 90 percent on a deliberately adversarial one. These are synthetic results; the next step is measuring on a real hospital's records with its own staff.",
    body: (
      <div className="s-proof">
        <span className="eyebrow">Proof so far</span>
        <h2>A working platform, and an engine that doesn’t guess.</h2>
        <div className="metrics">
          <div className="big"><strong>0</strong><span>wrong automatic links across 4 test sets</span><small>41,000+ labelled synthetic records</small></div>
          <div><strong>99.5%</strong><span>of duplicates found, with staff review</span><small>realistic 10,000-record file</small></div>
          <div><strong>89.7%</strong><span>found on a deliberately adversarial file</span><small>98.2% of suggestions correct</small></div>
          <div><strong>~3 s</strong><span>to check a 15,000-record register</span><small>SA benchmark, 33 facilities</small></div>
        </div>
        <ul className="built">
          <li><Check /> Patient app, provider workspace and admin console, live</li>
          <li><Check /> Signed summaries verifiable offline</li>
          <li><Check /> USSD and caregiver channels</li>
          <li><Check /> Staff labelling tool to measure accuracy on real records</li>
        </ul>
        <p className="label">Measured on synthetic data. Real-world accuracy is measured with a pilot institution’s own staff.</p>
      </div>
    ),
  },
  {
    id: "impact", title: "Smart City & impact", seconds: 25, tone: "light",
    notes: "This is digital public infrastructure for health. It improves public services at the front desk, includes people without smartphones or data, and makes care safer because critical information travels with the patient. For institutions, that means fewer duplicate folders, shorter queues and less medico-legal risk. For patients, it means control, and dignity.",
    body: (
      <div className="s-impact">
        <div>
          <span className="eyebrow">Smart City / ICT</span>
          <h2>Digital public infrastructure for health.</h2>
          <div className="tags"><span>Health</span><span>Public services</span><span>Digital inclusion</span><span>Safety</span></div>
          <ul className="impact">
            <li><b>Institutions</b> fewer duplicate folders, faster check-in, less medico-legal risk</li>
            <li><b>Patients</b> control over their information, and safer care when it matters</li>
            <li><b>Inclusion</b> USSD, caregivers and printed cards for people without smartphones or data</li>
            <li><b>Resilience</b> trust that still works when networks and systems go down</li>
          </ul>
        </div>
        <img src={elder} alt="" />
      </div>
    ),
  },
  {
    id: "model", title: "Business model & scale", seconds: 25, tone: "light",
    notes: "How we get paid. Institutions pay, never patients, and we never sell data. We start with a paid duplicate-identity study on one hospital's records. That becomes a subscription per facility for identity, consent and summaries. Then we scale across a provincial network, private groups, laboratories and medical schemes, and later the region. Each stage starts only when the evidence from the last one supports it.",
    body: (
      <div className="s-model">
        <span className="eyebrow">Business model & scale</span>
        <h2>Institutions pay. Patients never do. Data is never sold.</h2>
        <div className="stages">
          <div><span className="st">Stage 1</span><h3>Duplicate-identity study</h3><p>Paid study on one institution’s historical records, measured against its own staff.</p></div>
          <div><span className="st">Stage 2</span><h3>Subscription per facility</h3><p>Identity, consent and signed summaries at the front desk, priced per facility.</p></div>
          <div><span className="st">Stage 3</span><h3>Network scale</h3><p>Provincial networks, private groups, laboratories and medical schemes; then SADC.</p></div>
        </div>
        <div className="payers">Who pays: <span>Hospitals and groups</span><span>Laboratories</span><span>Medical schemes</span><span>Provincial health departments</span></div>
        <p className="gate">Each stage is gated by evidence from the one before.</p>
      </div>
    ),
  },
  {
    id: "team", title: "Team", seconds: 20, tone: "light",
    notes: "We're three students who built all of this ourselves. Martin brings cyber security, which matters when you're handling identity and consent. Thendo and Natheniel bring computer science and engineering. We've built a working platform before raising a cent. [Add one sentence, in your own words, on why this problem matters to you personally.]",
    body: (
      <div className="s-team">
        <span className="eyebrow">Team</span>
        <h2>Three builders who shipped a working platform before raising a cent.</h2>
        <div className="people">
          <div><span className="av">MT</span><h3>Martin Tlabela</h3><p>IT student · Cyber Security</p></div>
          <div><span className="av">TM</span><h3>Thendo Mulaudzi</h3><p>Computer Science student</p></div>
          <div><span className="av">TN</span><h3>Tsumbe Natheniel</h3><p>Computer Science student</p></div>
        </div>
        <p className="why">Security first, because identity and consent are only as good as the trust behind them.</p>
      </div>
    ),
  },
  {
    id: "ask", title: "The ask", seconds: 25, tone: "dark",
    notes: "We're asking for R900,000 in staged funding over 16 months. It pays for product development, validating the identity engine on real records, an independent security review, legal and POPIA compliance, and a pilot with a real institution. Our first next step: an introduction to a hospital or clinic network willing to run the Stage 1 study. Thank you. Come and try it with us after the session.",
    body: <Ask />,
  },
  /* ---------------- backup slides for questions (shown after the end, or with B) ---------------- */
  {
    id: "q-privacy", title: "Q&A · POPIA and security", seconds: 0, tone: "light", backup: true,
    notes: "If asked about privacy and security.",
    body: (
      <div className="s-qa">
        <span className="eyebrow">Questions · Privacy and security</span>
        <h2>We are a certificate authority, not a vault.</h2>
        <ul>
          <li><b>No clinical records held.</b> Summaries are signed by the institution and kept encrypted on the patient’s device.</li>
          <li><b>Consent is explicit, scoped and time-limited.</b> Every access is logged in a tamper-evident log the patient can see.</li>
          <li><b>Emergency access</b> is possible, loudly logged, and reported to the patient.</li>
          <li><b>Before any pilot:</b> independent security review and a POPIA legal opinion (part of this funding).</li>
        </ul>
      </div>
    ),
  },
  {
    id: "q-accuracy", title: "Q&A · How we measure accuracy", seconds: 0, tone: "light", backup: true,
    notes: "If asked how accuracy is measured or how it would work on real data.",
    body: (
      <div className="s-qa">
        <span className="eyebrow">Questions · Accuracy</span>
        <h2>We measure, we don’t claim.</h2>
        <ul>
          <li><b>Targets before going live:</b> automatic links ≥ 99.5% precise; ≥ 90% of duplicates found with review.</li>
          <li><b>On real records:</b> hospital staff label a random sample of pairs, blind to the engine; we report precision and recall with confidence ranges.</li>
          <li><b>Conservative by design:</b> anything uncertain goes to a person; twins, borrowed IDs and conflicting birthdays are never linked automatically.</li>
          <li><b>Every link is reversible</b> and explained, field by field.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "q-why", title: "Q&A · Why now, why us", seconds: 0, tone: "light", backup: true,
    notes: "If asked about competition, adoption or execution.",
    body: (
      <div className="s-qa">
        <span className="eyebrow">Questions · Adoption and execution</span>
        <h2>We fit beside what clinics already run.</h2>
        <ul>
          <li><b>No rip-and-replace:</b> standard HL7 FHIR interfaces; institutions keep their systems and remain the source of truth.</li>
          <li><b>Low-connectivity first:</b> offline verification, USSD and caregiver access from day one.</li>
          <li><b>Staged risk:</b> the paid Stage 1 study proves value on an institution’s own data before any live use.</li>
          <li><b>Execution:</b> a working platform already built by the team; funding goes to validation, security, compliance and a pilot.</li>
        </ul>
      </div>
    ),
  },
];

function Ask() {
  return (
    <div className="s-ask">
      <div>
        <span className="eyebrow">The ask</span>
        <h2><span className="amt">R900k</span> staged funding over 16 months</h2>
        <ul className="uses">
          <li>Product development</li>
          <li>Identity-match validation on real records</li>
          <li>Independent security review</li>
          <li>Legal and POPIA compliance</li>
          <li>A pilot with a real institution</li>
        </ul>
        <p className="cta">First next step: <b>an introduction to a hospital or clinic network</b> for a Stage 1 study.</p>
      </div>
      <div className="close">
        <img className="logo" src="/brand/clanclast-horizontal-on-dark.svg" alt="CLANCLAST" />
        <p className="end">No patient a stranger to their own healthcare system.</p>
        <p className="try">Try the live product with us after the session.</p>
      </div>
    </div>
  );
}
