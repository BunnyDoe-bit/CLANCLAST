import { useState } from "react";
import { ArrowLeft, Check, HeartHandshake, Loader2, X } from "lucide-react";
import { Logo } from "../components/shared/Brand";
import { DemoError, read, write, pause, now, mobileKey, org, providerById, patientById, logActivity, ensureCareTeam, expireConsents, type DB } from "../../demo/db";

/**
 * The channels for people without a smartphone: a USSD session on any phone, and a
 * caregiver approving on someone's behalf. Both run on the same in-browser demo store
 * as the patient app and provider workspace, so a request approved here is approved there.
 */

type Back = () => void;

/* ------------------------------------------------------------------ shared demo calls */

function pendingFor(db: DB, patientId: string) {
  expireConsents(db);
  return db.consents.filter((c) => c.patientId === patientId && c.status === "PENDING")
    .map((c) => ({ id: c.id, organization: org(db, c.orgId).name, scope: c.scope, reason: c.reason, provider: providerById(db, c.providerId).fullName }));
}
function decide(patientId: string, consentId: string, action: "approve" | "decline", actor: string) {
  return write((db) => {
    const c = db.consents.find((x) => x.id === consentId && x.patientId === patientId);
    if (!c || c.status !== "PENDING") throw new DemoError(409, "That request has already been answered.");
    c.status = action === "approve" ? "APPROVED" : "DECLINED";
    c.respondedAt = now();
    if (action === "approve") {
      c.duration = "SEVEN_DAYS";
      c.expiresAt = new Date(Date.now() + 7 * 864e5).toISOString();
      ensureCareTeam(db, patientId, c.orgId, c.providerId, "Connected via consent");
      const ref = db.referrals.find((r) => r.consentId === c.id);
      if (ref) ref.status = "SENT";
    }
    logActivity(db, { orgId: c.orgId, actorType: "PATIENT", actorLabel: actor, action: action === "approve" ? "Consent approved" : "Consent declined", subjectLabel: `${org(db, c.orgId).name} · ${c.scope.join(", ")}`, status: action === "approve" ? "Approved · 7 days" : "Declined" });
  });
}

/* ------------------------------------------------------------------ USSD */

type Screen = "dial" | "pin" | "menu" | "id" | "list" | "detail" | "emergency" | "done";

export function UssdSimulator({ back }: { back: Back }) {
  const [screen, setScreen] = useState<Screen>("dial");
  const [mobile, setMobile] = useState("");
  const [input, setInput] = useState("");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const db = read();
  const patient = patientId ? db.patients.find((p) => p.id === patientId) ?? null : null;
  const pending = patient ? pendingFor(db, patient.id) : [];
  const current = pending.find((c) => c.id === picked) ?? null;

  const lines: string[] = (() => {
    switch (screen) {
      case "dial": return ["CLANCLAST", "", "Enter your mobile number", "", "Demo: 082 555 0198"];
      case "pin": return ["CLANCLAST", "", "Enter your 4-digit PIN", "", "Demo PIN: 2580"];
      case "menu": return [`Hi ${patient?.fullName.split(" ")[0] ?? ""}`, "1 My CLANCLAST ID", `2 Requests (${pending.length})`, "3 Emergency contact", "0 Exit"];
      case "id": return ["Your CLANCLAST ID", patient?.humanetId ?? "", patient?.fullName ?? "", "", "0 Back"];
      case "list": return pending.length ? ["Waiting for you:", ...pending.slice(0, 4).map((c, i) => `${i + 1} ${c.organization}`), "0 Back"] : ["No requests waiting.", "", "0 Back"];
      case "detail": return current ? [current.organization, current.scope.join(", ").slice(0, 44), "", "1 Allow for 7 days", "2 Decline", "0 Back"] : ["Request not found", "0 Back"];
      case "emergency": return ["Emergency contact", patient?.emergencyContactName ?? "Not on file", patient?.emergencyContactRelationship ?? "", "", "0 Back"];
      case "done": return [msg, "", "0 Main menu"];
    }
  })();

  async function send() {
    const v = input.trim();
    setInput(""); setMsg((m) => (screen === "done" ? m : ""));
    setBusy(true);
    await pause(null, 260);
    setBusy(false);
    if (screen === "dial") {
      const p = read().patients.find((x) => x.mobile === mobileKey(v));
      if (!p) { setMsg("Number not registered"); return; }
      setMobile(v); setPatientId(p.id); setScreen("pin"); return;
    }
    if (screen === "pin") {
      if (!patient || v !== patient.pin) { setMsg("Wrong PIN. Try again."); return; }
      setScreen("menu"); return;
    }
    if (v === "0") { if (screen === "menu") { setScreen("dial"); setPatientId(null); setMobile(""); } else setScreen(screen === "detail" ? "list" : "menu"); return; }
    if (screen === "menu") { setScreen(v === "1" ? "id" : v === "2" ? "list" : v === "3" ? "emergency" : "menu"); return; }
    if (screen === "list") { const c = pending[Number(v) - 1]; if (c) { setPicked(c.id); setScreen("detail"); } return; }
    if (screen === "detail" && current && patient && (v === "1" || v === "2")) {
      try { decide(patient.id, current.id, v === "1" ? "approve" : "decline", patient.fullName); setMsg(v === "1" ? "Allowed for 7 days. You can revoke it in the app." : "Declined. Nothing was shared."); }
      catch (e) { setMsg(e instanceof Error ? e.message : "Something went wrong"); }
      setScreen("done");
    }
  }

  return (
    <ChannelPage back={back} eyebrow="No smartphone needed" title="USSD on any phone" text="Dial in from the most basic handset to see your ID, answer access requests and check your emergency contact. Answers here reach the patient app and provider workspace too.">
      <div className="mx-auto w-[300px] rounded-[46px] bg-[#1b2422] p-4 pb-6 shadow-[0_40px_80px_-30px_rgba(7,43,39,.6)] ring-1 ring-black/40">
        <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-black/50" />
        <div className="rounded-[14px] bg-[#c7d8b3] p-4 font-mono text-[13px] leading-[1.55] text-[#1d2a18] shadow-[inset_0_2px_8px_rgba(0,0,0,.25)]" aria-live="polite">
          <div className="mb-2 flex justify-between text-[10px] opacity-70"><span>▮▮▮▯ CLANCLAST</span><span>12:41</span></div>
          <div className="min-h-[150px]">
            {lines.map((l, i) => <p key={i} className="truncate">{l || " "}</p>)}
            {msg && screen !== "done" && <p className="mt-1 font-bold">{msg}</p>}
            {busy && <p className="mt-1 animate-pulse">Sending…</p>}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) send(); }} className="mt-3 flex gap-2 border-t border-[#1d2a18]/25 pt-3">
            <input value={input} onChange={(e) => setInput(e.target.value)} inputMode={screen === "dial" ? "tel" : "numeric"} type={screen === "pin" ? "password" : "text"} aria-label="Reply"
              className="min-w-0 flex-1 rounded-md bg-[#dbe7cb] px-2 py-1.5 text-[#1d2a18] outline-none placeholder:text-[#1d2a18]/45" placeholder={screen === "dial" ? "082 555 0198" : "Reply"} autoFocus />
            <button className="rounded-md bg-[#1d2a18] px-3 text-[12px] font-bold text-[#dbe7cb]">Send</button>
          </form>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2.5 px-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((k) => (
            <button key={k} type="button" onClick={() => setInput((s) => (s + k).slice(0, 13))} className="h-10 rounded-full bg-[#2b3633] text-[15px] font-semibold text-white/90 shadow-[inset_0_-2px_0_rgba(0,0,0,.35)] active:translate-y-px">{k}</button>
          ))}
        </div>
      </div>
      {mobile && <p className="mt-4 text-center text-xs text-muted-foreground">Session for {mobile}. Replies are processed in this browser only.</p>}
    </ChannelPage>
  );
}

/* ------------------------------------------------------------------ Caregiver */

export function CaregiverPortal({ back }: { back: Back }) {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [who, setWho] = useState<{ caregiverName: string; patientId: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [, force] = useState(0);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    await pause(null, 300);
    const c = read().caregivers.find((x) => x.phone === mobileKey(phone) && x.pin === pin);
    setBusy(false);
    if (!c) { setError("That phone number and PIN don't match a caregiver."); return; }
    setWho({ caregiverName: c.name, patientId: c.patientId });
  }

  const db = read();
  const patient = who ? patientById(db, who.patientId) : null;
  const pending = patient ? pendingFor(db, patient.id) : [];

  return (
    <ChannelPage back={back} eyebrow="Someone you trust" title="Caregiver access" text="A patient can name a caregiver who answers access requests for them, for example an adult child helping a parent. Every answer is logged in the patient's own access history.">
      <div className="mx-auto w-full max-w-[420px] rounded-[28px] border border-border bg-card p-6 shadow-[0_30px_60px_-30px_rgba(7,43,39,.35)]">
        {!who || !patient ? (
          <form onSubmit={login} className="space-y-4">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-accent-foreground"><HeartHandshake size={20} /></span><div><p className="font-bold">Caregiver sign in</p><p className="text-xs text-muted-foreground">Demo: 082 555 0199 · PIN 1234</p></div></div>
            <label className="block text-xs font-semibold text-muted-foreground">Phone number<input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="mt-1.5 w-full rounded-xl border border-border bg-muted px-3.5 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/30" /></label>
            <label className="block text-xs font-semibold text-muted-foreground">PIN<input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} type="password" inputMode="numeric" className="mt-1.5 w-full rounded-xl border border-border bg-muted px-3.5 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/30" /></label>
            {error && <p role="alert" className="rounded-xl bg-critical-tint px-3 py-2 text-xs font-semibold text-critical">{error}</p>}
            <button disabled={busy || !phone || !pin} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy && <Loader2 size={16} className="animate-spin" />}Sign in</button>
            <button type="button" onClick={() => { setPhone("082 555 0199"); setPin("1234"); }} className="w-full text-center text-xs font-bold text-primary">Use the demo caregiver</button>
          </form>
        ) : (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.16em] text-primary">{who.caregiverName}, caring for</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{patient.fullName}</p>
            <p className="font-mono text-xs text-muted-foreground">{patient.humanetId}</p>
            <p className="mt-6 text-sm font-bold">Requests waiting</p>
            <div className="mt-2 space-y-2.5">
              {pending.length === 0 && <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">Nothing waiting. New requests from clinics appear here and in {patient.fullName.split(" ")[0]}'s app.</p>}
              {pending.map((c) => (
                <div key={c.id} className="rounded-2xl border border-border p-4">
                  <p className="text-sm font-bold">{c.organization}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.scope.join(" · ")}{c.reason ? ` · ${c.reason}` : ""}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button onClick={() => { decide(patient.id, c.id, "decline", `${who.caregiverName} (caregiver)`); force((n) => n + 1); }} className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-xs font-bold"><X size={14} /> Decline</button>
                    <button onClick={() => { decide(patient.id, c.id, "approve", `${who.caregiverName} (caregiver)`); force((n) => n + 1); }} className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground"><Check size={14} /> Allow 7 days</button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => { setWho(null); setPin(""); }} className="mt-6 text-xs font-bold text-critical">Sign out</button>
          </div>
        )}
      </div>
    </ChannelPage>
  );
}

/* ------------------------------------------------------------------ page */

function ChannelPage({ back, eyebrow, title, text, children }: { back: Back; eyebrow: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="cc-canvas min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <a href="/" aria-label="CLANCLAST home"><Logo height={28} /></a>
        <button onClick={back} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold"><ArrowLeft size={16} /> Back to the site</button>
      </header>
      <main className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">{text}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <a href="/patient" className="rounded-full bg-primary px-5 py-2.5 font-bold text-primary-foreground">Open the patient app</a>
            <a href="/provider" className="rounded-full border border-border bg-card px-5 py-2.5 font-bold">Open the provider workspace</a>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">Live demo · fictional data that stays in this browser.</p>
        </div>
        <div>{children}</div>
      </main>
    </div>
  );
}
