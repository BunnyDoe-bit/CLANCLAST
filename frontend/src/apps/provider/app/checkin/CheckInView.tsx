import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Fingerprint, QrCode, Search, UserPlus } from "lucide-react";
import { ApiError, providerApi, type Match, type PatientRef } from "../../lib/api";
import { navigate } from "../lib/router";
import { checkSaId, normaliseMobile, parseCode, setHandoff } from "../lib/identity";
import { Segmented, TextField } from "../ui/controls";
import { CheckInPanel } from "./CheckInPanel";
import { MatchRow } from "./MatchRow";

type Mode = "scan" | "search";
type Found = { patient: PatientRef; via: string };

/**
 * Check-in. Two ways to find someone — their code, or what they tell you —
 * then one panel to confirm identity and check them in. Search never creates
 * anything: when nothing matches, registration starts with what was typed.
 */
export default function CheckInView() {
  const [mode, setMode] = useState<Mode>("scan");
  const [found, setFound] = useState<Found | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const reset = () => setFound(null);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="large-title">Check-in</h1>
          <p className="mt-1 text-subhead text-ink-2">Find the patient, confirm it’s them, check them in.</p>
        </div>
        <button onClick={() => navigate("register")} className="btn btn-quiet"><UserPlus size={17} /> Register new patient</button>
      </div>

      <div className="grid items-start gap-3 @5xl/app:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="glass p-5">
          <Segmented<Mode> label="How to find the patient" value={mode} onChange={(m) => { setMode(m); reset(); setResults(null); }}
            options={[{ v: "scan", label: "Scan code" }, { v: "search", label: "Search details" }]} />
          <div className="mt-5">{mode === "scan" ? <ScanFinder onFound={setFound} /> : <SearchFinder onResults={(r) => { setFound(null); setResults(r); }} />}</div>
        </section>

        <div className="min-w-0">
          {found ? (
            <CheckInPanel key={found.patient.id} patient={found.patient} via={found.via} onReset={reset} />
          ) : results && mode === "search" ? (
            <ResultList r={results} onFound={setFound} />
          ) : (
            <Waiting mode={mode} />
          )}
        </div>
      </div>
    </>
  );
}

function Waiting({ mode }: { mode: Mode }) {
  return (
    <div className="glass hidden min-h-[240px] flex-col items-center justify-center p-8 text-center @5xl/app:flex">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-tint text-accent">{mode === "scan" ? <QrCode size={22} /> : <Fingerprint size={22} />}</span>
      <p className="mt-3 text-callout font-semibold">{mode === "scan" ? "Waiting for a code" : "Matches appear here"}</p>
      <p className="mt-1 max-w-[36ch] text-footnote text-ink-2">
        {mode === "scan" ? "Patients show it in the CLANCLAST app under Share, or on their card." : "Each match shows the evidence behind it. Uncertain ones are yours to judge."}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- Scan */

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

function ScanFinder({ onFound }: { onFound: (f: Found) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [camera, setCamera] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const canScan = typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;

  // Hand-held scanners type the code and press Enter, so the field is ready immediately.
  useEffect(() => { input.current?.focus(); }, []);

  async function resolve(raw: string, via: string) {
    const parsed = parseCode(raw);
    if (!parsed) { setError("That isn’t a CLANCLAST code or ID. IDs look like HN-1234-5678."); return; }
    setBusy(true); setError("");
    try {
      const r = await providerApi.verify(parsed);
      onFound({ patient: r.patient, via });
      setCode("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn’t reach CLANCLAST. Check your connection.");
    } finally { setBusy(false); }
  }

  return (
    <div>
      {camera && <CameraScanner onCode={(c) => { setCamera(false); resolve(c, "scanning their code"); }} onClose={() => setCamera(false)} />}
      {!camera && canScan && (
        <button onClick={() => setCamera(true)} className="press mb-4 flex w-full items-center gap-3 rounded-[18px] border border-dashed border-[var(--hairline-strong)] p-4 text-left">
          <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-ink text-[var(--canvas-base)]"><Camera size={19} /></span>
          <span><span className="block text-callout font-semibold">Use the camera</span><span className="block text-footnote text-ink-2">Point it at the code on their phone or card.</span></span>
        </button>
      )}
      <form onSubmit={(e) => { e.preventDefault(); resolve(code, /^\s*\{/.test(code) ? "scanning their code" : "CLANCLAST ID"); }}>
        <label className="field">
          <span className="field-label">{canScan ? "Or use a scanner, or type their CLANCLAST ID" : "Scan with a hand-held scanner, or type their CLANCLAST ID"}</span>
          <input ref={input} className="input mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="HN-1234-5678" autoComplete="off" spellCheck={false} />
        </label>
        {error && <p role="alert" className="mt-3 rounded-[14px] bg-critical-tint px-3.5 py-2.5 text-footnote text-critical">{error}</p>}
        <button type="submit" disabled={!code.trim() || busy} className="btn btn-primary btn-block mt-4">{busy ? "Checking…" : "Find patient"}</button>
      </form>
      <p className="mt-4 text-caption text-ink-3">Codes from the patient app refresh every 5 minutes, so a screenshot can’t be reused later.</p>
    </div>
  );
}

export function CameraScanner({ onCode, onClose }: { onCode: (c: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState("");
  const cb = useRef(onCode);
  cb.current = onCode;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let done = false;
    const Ctor = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    const detector = new Ctor({ formats: ["qr_code"] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then((s) => {
      stream = s;
      const v = video.current!;
      v.srcObject = s;
      v.play();
      const tick = async () => {
        if (done) return;
        if (v.readyState >= 2) {
          const codes = await detector.detect(v).catch(() => []);
          if (codes[0]?.rawValue) { done = true; cb.current(codes[0].rawValue); return; }
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
    }).catch(() => setFailed("Camera access was blocked. Allow it in the browser, or use the field below."));
    return () => { done = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  return (
    <div className="mb-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-black">
        {failed ? <p className="grid h-full place-items-center p-6 text-center text-footnote text-white/80">{failed}</p> : <video ref={video} muted playsInline className="h-full w-full object-cover" />}
        <i aria-hidden="true" className="pointer-events-none absolute inset-[18%] rounded-[24px] shadow-[0_0_0_999px_rgb(0_0_0/0.35)] ring-2 ring-white/80" />
      </div>
      <button onClick={onClose} className="btn btn-quiet btn-block mt-2"><CameraOff size={16} /> Stop camera</button>
    </div>
  );
}

/* ---------------------------------------------------------------- Search */

function SearchFinder({ onResults }: { onResults: (r: Results | null) => void }) {
  const [f, setF] = useState({ fullName: "", nationalId: "", dateOfBirth: "", mobile: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (v: string) => { setF((x) => ({ ...x, [k]: v })); onResults(null); };

  const id = checkSaId(f.nationalId);
  const idTyped = f.nationalId.replace(/\s/g, "").length === 13;

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const r = await providerApi.checkinLookup({
        fullName: f.fullName.trim(),
        ...(f.dateOfBirth ? { dateOfBirth: f.dateOfBirth } : {}),
        ...(f.mobile.trim() ? { mobile: normaliseMobile(f.mobile) } : {}),
        ...(f.nationalId.trim() ? { nationalId: f.nationalId.replace(/\s/g, "") } : {}),
      });
      onResults({ matches: r.matches, form: { ...f } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn’t reach CLANCLAST. Check your connection.");
    } finally { setBusy(false); }
  }

  return (
    <div>
      <form onSubmit={search} className="grid gap-3.5 @xl/app:grid-cols-2">
        <div className="@xl/app:col-span-2"><TextField label="Full name" autoComplete="off" value={f.fullName} onChange={set("fullName")} /></div>
        <div>
          <TextField label="SA ID number" inputMode="numeric" autoComplete="off" value={f.nationalId}
            onChange={(v) => { const c = v.replace(/[^\d\s]/g, "").slice(0, 15); set("nationalId")(c); const r = checkSaId(c); if (r.ok && r.dob) setF((x) => ({ ...x, nationalId: c, dateOfBirth: r.dob! })); }} />
          {idTyped && !id.ok && <p className="mt-1.5 text-caption text-critical">Check digit doesn’t match. Confirm the number.</p>}
        </div>
        <TextField label="Date of birth" type="date" value={f.dateOfBirth} onChange={set("dateOfBirth")} />
        <div className="@xl/app:col-span-2"><TextField label="Mobile" type="tel" inputMode="tel" autoComplete="off" placeholder="082 555 0198" value={f.mobile} onChange={set("mobile")} /></div>
        {error && <p role="alert" className="rounded-[14px] bg-critical-tint px-3.5 py-2.5 text-footnote text-critical @xl/app:col-span-2">{error}</p>}
        <button type="submit" disabled={busy || f.fullName.trim().length < 2} className="btn btn-primary btn-block @xl/app:col-span-2"><Search size={16} /> {busy ? "Searching…" : "Find matches"}</button>
      </form>
      <p className="mt-3 text-caption text-ink-3">More details, fewer false matches. Name alone is never enough for a strong match.</p>

    </div>
  );
}

type Results = { matches: Match[]; form: { fullName: string; nationalId: string; dateOfBirth: string; mobile: string } };

function ResultList({ r, onFound }: { r: Results; onFound: (f: Found) => void }) {
  const ref = useRef<HTMLElement>(null);
  // On phones the results sit below the form; bring them into view.
  useEffect(() => { ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [r]);
  const register = () => { setHandoff({ ...r.form, mobile: r.form.mobile.trim() }); navigate("register"); };
  const first = r.form.fullName.trim().split(" ")[0];
  const strong = r.matches.filter((m) => m.tier === "auto_link").length;
  if (r.matches.length === 0) {
    return (
      <section ref={ref} className="glass enter scroll-mt-24 p-8 text-center">
        <p className="text-callout font-semibold">No existing CLANCLAST ID matches</p>
        <p className="mt-1 text-footnote text-ink-2">If you’re sure the details are right, register {first}.</p>
        <button onClick={register} className="btn btn-primary mt-4"><UserPlus size={16} /> Register {first}</button>
      </section>
    );
  }
  return (
    <section ref={ref} className="enter scroll-mt-24">
      <p className="eyebrow mb-2 px-1">{r.matches.length === 1 ? "1 possible match" : `${r.matches.length} possible matches`}</p>
      {strong > 1 && (
        <p className="mb-2 flex gap-2.5 rounded-[16px] bg-warning-tint px-3.5 py-2.5 text-footnote text-warning">
          <Fingerprint size={16} className="mt-0.5 shrink-0" />
          {strong} different IDs strongly match these details, so they may be the same person registered twice. Check in the right one; the pair is flagged for review in Identity.
        </p>
      )}
      <ul className="space-y-2">
        {r.matches.map((m) => <MatchRow key={m.patientId} m={m} onPick={() => onFound({ patient: { id: m.patientId, humanetId: m.humanetId, fullName: m.fullName, identityVerified: m.identityVerified }, via: "matching their details" })} />)}
      </ul>
      <button onClick={register} className="btn btn-quiet btn-block mt-3"><UserPlus size={16} /> None of these — register as new</button>
    </section>
  );
}
