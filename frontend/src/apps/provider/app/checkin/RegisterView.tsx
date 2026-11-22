import { useState } from "react";
import { BadgeCheck, Check, ChevronLeft, Handshake, ScanLine, ShieldCheck, UserPlus } from "lucide-react";
import { ApiError, providerApi, type IdentityDocument, type Match, type PatientRef } from "../../lib/api";
import { navigate } from "../lib/router";
import { checkSaId, DOCUMENTS, normaliseMobile, takeHandoff } from "../lib/identity";
import { Segmented, TextField } from "../ui/controls";
import { CheckInPanel } from "./CheckInPanel";
import { isExact, MatchRow } from "./MatchRow";

/**
 * Provider-assisted registration, for patients without a smartphone or who'd
 * rather be helped. Demographics only — nothing clinical (Canon Rule 1).
 * The duplicate check runs before anything is created: a second ID for the
 * same person is the exact problem CLANCLAST exists to remove.
 */
type Step = "form" | "duplicates" | "done";
type DocChoice = IdentityDocument | "NONE";

export default function RegisterView() {
  const [f, setF] = useState(() => {
    const h = takeHandoff();
    return { fullName: h?.fullName ?? "", nationalId: h?.nationalId ?? "", dateOfBirth: h?.dateOfBirth ?? "", mobile: h?.mobile ?? "", emergencyContactName: "", emergencyContactRelationship: "" };
  });
  const [doc, setDoc] = useState<DocChoice>("SA_ID");
  const [step, setStep] = useState<Step>("form");
  const [matches, setMatches] = useState<Match[]>([]);
  const [picked, setPicked] = useState<PatientRef | null>(null);
  // The server already counts a prevented duplicate when it refuses a second registration.
  const [countedByServer, setCountedByServer] = useState(false);
  const [created, setCreated] = useState<PatientRef | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const id = checkSaId(f.nationalId);
  const idDigits = f.nationalId.replace(/\s/g, "");
  const idOk = doc === "SA_ID" ? id.ok : idDigits.length >= 4;
  const mobileOk = /^\+?\d{9,15}$/.test(normaliseMobile(f.mobile));
  const ok = f.fullName.trim().length >= 2 && idOk && !!f.dateOfBirth && mobileOk;

  const payload = () => ({
    fullName: f.fullName.trim(), dateOfBirth: f.dateOfBirth, nationalId: idDigits, mobile: normaliseMobile(f.mobile),
    ...(f.emergencyContactName.trim() ? { emergencyContactName: f.emergencyContactName.trim(), emergencyContactRelationship: f.emergencyContactRelationship.trim() } : {}),
    identityDocument: doc,
  });

  async function create() {
    setBusy(true); setError("");
    try {
      setCreated(await providerApi.registerPatient(payload()));
      setStep("done");
    } catch (e) {
      const existing = (e instanceof ApiError && e.status === 409 && (e.details as { existing?: { id: string; humanetId: string; fullName: string } })?.existing) || null;
      if (existing) {
        // Same ID or mobile already registered: this is a check-in, not a registration.
        const v = await providerApi.verify({ humanetId: existing.humanetId }).catch(() => null);
        setCountedByServer(true);
        setPicked(v?.patient ?? { ...existing, identityVerified: false });
        setError(e instanceof ApiError ? e.message : "");
      } else setError(e instanceof ApiError ? e.message : "Couldn’t reach CLANCLAST. Check your connection.");
    } finally { setBusy(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const p = payload();
      const r = await providerApi.checkinLookup({ fullName: p.fullName, dateOfBirth: p.dateOfBirth, mobile: p.mobile, nationalId: p.nationalId });
      if (r.matches.length) { setMatches(r.matches); setStep("duplicates"); setBusy(false); return; }
    } catch { /* the server repeats the hard duplicate check on create */ }
    await create();
  }

  if (picked) {
    return (
      <Frame back={() => { setPicked(null); setError(""); setCountedByServer(false); }} title="Already registered">
        {error && <p className="mb-3 rounded-[14px] bg-warning-tint px-3.5 py-2.5 text-footnote text-warning">{error}</p>}
        <CheckInPanel patient={picked} via="their existing registration" preventedDuplicate={!countedByServer} onReset={() => navigate("checkin")} />
      </Frame>
    );
  }

  if (step === "done" && created) {
    return (
      <Frame title="Registered">
        <section className="glass enter p-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent text-on-accent"><Check size={28} strokeWidth={2.6} /></span>
          <p className="mt-4 text-title-3 font-semibold">{created.fullName}</p>
          <p className="mono mt-1 text-title-2 tracking-[0.02em]">{created.humanetId}</p>
          {created.identityVerified
            ? <span className="badge mt-3 bg-positive-tint text-positive"><BadgeCheck size={13} strokeWidth={2.4} /> Identity verified against {DOCUMENTS.find((d) => d.v === doc)?.label}</span>
            : <span className="badge mt-3 bg-warning-tint text-warning">Identity check pending</span>}
          <p className="mx-auto mt-4 max-w-[46ch] text-footnote text-ink-2">
            Give them this ID. With a phone they can sign in to the CLANCLAST app with their mobile number; without one, a card or USSD works the same way.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button onClick={() => navigate("consent", { search: `request=${created.id}` })} className="btn btn-quiet"><Handshake size={16} /> Request access</button>
            <button onClick={() => navigate("checkin")} className="btn btn-primary"><ScanLine size={16} /> Next patient</button>
          </div>
        </section>
      </Frame>
    );
  }

  if (step === "duplicates") {
    return (
      <Frame back={() => setStep("form")} title="Is this someone we already know?">
        <p className="mb-4 max-w-[60ch] text-subhead text-ink-2">
          These existing CLANCLAST IDs look like {f.fullName.trim().split(" ")[0]}. Registering again would split their history across two IDs.
        </p>
        <ul className="space-y-2">
          {matches.map((m) => (
            <MatchRow key={m.patientId} m={m} onPick={() => setPicked({ id: m.patientId, humanetId: m.humanetId, fullName: m.fullName, identityVerified: m.identityVerified })} />
          ))}
        </ul>
        {error && <p role="alert" className="mt-3 rounded-[14px] bg-critical-tint px-3.5 py-2.5 text-footnote text-critical">{error}</p>}
        {matches.some(isExact)
          ? <p className="mt-4 text-center text-footnote text-ink-2">This ID number is already registered, so a second CLANCLAST ID can’t be created for it.</p>
          : <button onClick={create} disabled={busy} className="btn btn-quiet btn-block mt-4"><UserPlus size={16} /> {busy ? "Registering…" : "Different person — register anyway"}</button>}
      </Frame>
    );
  }

  return (
    <Frame back={() => navigate("checkin")} title="Register a patient">
      <form onSubmit={submit} className="grid items-start gap-3 @5xl/app:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="glass grid gap-3.5 p-5 @xl/app:grid-cols-2">
          <h2 className="eyebrow @xl/app:col-span-2">Identity</h2>
          <div className="@xl/app:col-span-2"><TextField label="Full name, as on their document" autoComplete="off" value={f.fullName} onChange={set("fullName")} /></div>
          <div className="@xl/app:col-span-2">
            <p className="mb-1.5 text-footnote font-medium text-ink-2">Document you checked</p>
            <Segmented<DocChoice> label="Document" size="sm" value={doc} onChange={setDoc}
              options={[...DOCUMENTS.map((d) => ({ v: d.v as DocChoice, label: d.label })), { v: "NONE", label: "None seen" }]} />
          </div>
          <div>
            <TextField label={doc === "SA_ID" || doc === "NONE" ? "SA ID number" : "Document number"} inputMode={doc === "SA_ID" ? "numeric" : "text"} autoComplete="off" value={f.nationalId}
              onChange={(v) => { const c = doc === "SA_ID" ? v.replace(/[^\d\s]/g, "").slice(0, 15) : v.slice(0, 20); set("nationalId")(c); const r = checkSaId(c); if (doc === "SA_ID" && r.ok && r.dob) set("dateOfBirth")(r.dob); }} />
            {doc === "SA_ID" && idDigits.length === 13 && !id.ok && <p className="mt-1.5 text-caption text-critical">Check digit doesn’t match. Confirm the number.</p>}
          </div>
          <TextField label="Date of birth" type="date" value={f.dateOfBirth} onChange={set("dateOfBirth")} />
          <div className="@xl/app:col-span-2">
            <TextField label="Mobile (any phone, including feature phones)" type="tel" inputMode="tel" autoComplete="off" placeholder="082 555 0198" value={f.mobile} onChange={set("mobile")} />
          </div>
          {doc === "NONE" && (
            <p className="rounded-[14px] bg-warning-tint px-3.5 py-2.5 text-footnote text-warning @xl/app:col-span-2">
              Without a document the ID is created as <b className="font-semibold">identity check pending</b>. Any participating clinic can verify it later.
            </p>
          )}
        </section>

        <div className="grid gap-3">
          <section className="glass grid gap-3.5 p-5">
            <h2 className="eyebrow">Emergency contact <span className="font-normal normal-case tracking-normal text-ink-3">· optional</span></h2>
            <TextField label="Name" autoComplete="off" value={f.emergencyContactName} onChange={set("emergencyContactName")} />
            <TextField label="Relationship" autoComplete="off" value={f.emergencyContactRelationship} onChange={set("emergencyContactRelationship")} />
          </section>
          <section className="glass p-5">
            <p className="flex gap-2.5 text-footnote text-ink-2"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-accent" />No clinical information is collected here. Allergies, medication and history stay in your own system and reach the patient as a signed summary.</p>
            {error && <p role="alert" className="mt-3 rounded-[14px] bg-critical-tint px-3.5 py-2.5 text-footnote text-critical">{error}</p>}
            <button type="submit" disabled={!ok || busy} className="btn btn-primary btn-lg btn-block mt-4">{busy ? "Checking for duplicates…" : "Check for duplicates and register"}</button>
          </section>
        </div>
      </form>
    </Frame>
  );
}

function Frame({ title, back, children }: { title: string; back?: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="mb-5">
        {back && <button onClick={back} className="-ml-1.5 mb-1 inline-flex items-center gap-0.5 text-subhead font-medium text-accent"><ChevronLeft size={18} /> Back</button>}
        <h1 className="large-title">{title}</h1>
      </div>
      {children}
    </>
  );
}
