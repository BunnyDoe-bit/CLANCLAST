/**
 * Website demo: the patient app's API, answered by the in-browser demo backend
 * (src/demo/db.ts) instead of a server. Same functions and response shapes as the
 * production client, so the screens are the real ones. Nothing leaves this browser.
 */
import { renderSVG } from "uqr";
import {
  DemoError, read, write, pause, fail, uid, now, mobileKey, digits, newHumanetId, org, patientById, providerById, logActivity, notify, ensureCareTeam,
  expireConsents, activeKey, signVcJwt, registry, SYNTHETIC_ISSUER, SUMMARY_FORMAT, type Patient, type DB,
} from "../../../demo/db";

export const BASE_URL = "/demo";

type Session = "patient" | "provider" | "caregiver";
const tokenKey = (session: Session) => `humanet_${session}_token`;
export function getToken(session: Session): string | null { try { return localStorage.getItem(tokenKey(session)); } catch { return null; } }
export function setToken(session: Session, token: string) { try { localStorage.setItem(tokenKey(session), token); } catch { /* ignore */ } }
export function clearToken(session: Session) { try { localStorage.removeItem(tokenKey(session)); } catch { /* ignore */ } }

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) { super(message); this.status = status; this.details = details; }
}

/** Run a demo call; demo errors surface exactly like server errors. */
async function call<T>(fn: () => T | Promise<T>, ms?: number): Promise<T> {
  try { return await pause(await fn(), ms); }
  catch (e) {
    if (e instanceof DemoError) {
      if (e.status === 401 && getToken("patient")) { clearToken("patient"); window.dispatchEvent(new CustomEvent("cc:session-expired", { detail: "patient" })); }
      await pause(null, 120);
      throw new ApiError(e.status, e.message);
    }
    throw e;
  }
}

function meId(): string {
  const t = getToken("patient");
  const id = t?.startsWith("demo:patient:") ? t.slice(13) : null;
  if (!id || !read().patients.some((p) => p.id === id)) throw new DemoError(401, "Your demo session has ended. Please sign in again.");
  return id;
}
const me = (db: DB) => patientById(db, meId());

function completion(p: Patient) {
  const fields = [p.fullName, p.dateOfBirth, p.nationalId, p.mobile, p.email, p.emergencyContactName, p.emergencyContactRelationship];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}
const profileView = (p: Patient) => ({ id: p.id, humanetId: p.humanetId, fullName: p.fullName, passportCompletion: completion(p) });
const qrToken = (p: Patient) => `demo.${btoa(JSON.stringify({ h: p.humanetId, e: Date.now() + 300_000 }))}`;

// ---------- Auth ----------

export const authApi = {
  patientRegister: (payload: { fullName: string; dateOfBirth: string; nationalId: string; mobile: string; email?: string; password: string; emergencyContactName?: string; emergencyContactRelationship?: string; allergies?: string; bloodType?: string }) =>
    call(() => write((db) => {
      const mobile = mobileKey(payload.mobile), nid = digits(payload.nationalId);
      if (db.patients.some((p) => p.mobile === mobile)) throw new DemoError(409, "That mobile number already has a CLANCLAST ID. Try signing in.");
      if (nid && db.patients.some((p) => p.nationalId === nid)) throw new DemoError(409, "That ID number already has a CLANCLAST ID. Try signing in, or ask a clinic to help.");
      const p: Patient = {
        id: uid("pt"), humanetId: newHumanetId(db), fullName: payload.fullName.trim(), dateOfBirth: payload.dateOfBirth, nationalId: nid, mobile, email: payload.email || null,
        password: payload.password, pin: "0000", identityVerified: false, registeredBy: "patient", createdAt: now(),
        emergencyContactName: payload.emergencyContactName || null, emergencyContactRelationship: payload.emergencyContactRelationship || null,
        language: "English", largeText: false, defaultConsentDuration: "SEVEN_DAYS", notifyActionRequired: true, notifyImportant: true, notifyInformational: true,
      };
      db.patients.push(p);
      notify(db, p.id, "INFORMATIONAL", "Welcome to CLANCLAST", "Show your ID at a participating clinic to have it verified.");
      return { token: `demo:patient:${p.id}`, patient: profileView(p) };
    }), 600),

  patientLogin: (identifier: string, password: string) =>
    call(() => {
      const db = read();
      const id = identifier.trim().toLowerCase();
      const p = db.patients.find((x) => (x.email && x.email.toLowerCase() === id) || (digits(id).length >= 9 && x.mobile === mobileKey(id)));
      if (!p || p.password !== password) throw new DemoError(401, "Those details don't match a CLANCLAST ID.");
      return { token: `demo:patient:${p.id}`, patient: profileView(p) };
    }, 350),

  me: (_session: Session) => call(() => ({ patient: profileView(me(read())) })),
  providerLogin: (_email: string, _password: string): Promise<never> => fail(400, "Use the provider workspace to sign in as staff."),
  caregiverLogin: (_phone: string, _pin: string): Promise<never> => fail(400, "Caregiver sign-in isn't part of this demo."),
};

// ---------- Patient ----------

export const patientApi = {
  passport: () => call(() => write((db) => {
    expireConsents(db);
    const p = me(db);
    return {
      patient: { fullName: p.fullName, humanetId: p.humanetId, identityVerified: p.identityVerified, passportCompletion: completion(p) },
      emergencyInformation: { emergencyContactName: p.emergencyContactName, emergencyContactRelationship: p.emergencyContactRelationship },
      careTeam: db.careTeam.filter((c) => c.patientId === p.id).map((m) => ({ id: m.id, label: m.label, role: m.role, status: m.status })),
      credentials: db.credentials.filter((c) => c.patientId === p.id).map((c) => ({ id: c.id, type: c.type, status: c.status, issuer: org(db, c.issuerOrgId).name, issuedAt: c.issuedAt })),
      activePermissions: db.consents.filter((c) => c.patientId === p.id && c.status === "APPROVED").length,
    };
  })),
  qr: () => call(() => { const p = me(read()); return { humanetId: p.humanetId, fullName: p.fullName, qrToken: qrToken(p), expiresInSeconds: 300 }; }),
  fetchQrPng: () => call(() => { const p = me(read()); return svgUrl(JSON.stringify({ humanetId: p.humanetId, token: qrToken(p) })); }),
  fetchCredentialQr: (credentialId: string) => call(() => svgUrl(JSON.stringify({ credentialId }))),
  downloadHealthCard: (humanetId: string) => call(() => {
    const p = me(read());
    const qr = renderSVG(JSON.stringify({ humanetId: p.humanetId, token: qrToken(p) }), { border: 1, pixelSize: 4, whiteColor: "#ffffff", blackColor: "#072b27" });
    const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="1040" viewBox="0 0 340 520"><rect width="340" height="520" rx="22" fill="#072b27"/><text x="24" y="44" fill="#fff" font-family="system-ui,sans-serif" font-size="12" font-weight="700" letter-spacing="2">CLANCLAST</text><text x="24" y="62" fill="#8dd4ca" font-family="system-ui,sans-serif" font-size="9">Health identity card · DEMONSTRATION ONLY</text><rect x="20" y="90" width="300" height="320" rx="16" fill="#fff"/><text x="36" y="124" fill="#072b27" font-family="system-ui,sans-serif" font-size="17" font-weight="700">${esc(p.fullName)}</text><text x="36" y="150" fill="#4a625f" font-family="system-ui,sans-serif" font-size="9">CLANCLAST ID</text><text x="36" y="166" fill="#072b27" font-family="ui-monospace,monospace" font-size="14" font-weight="700">${esc(p.humanetId)}</text><text x="36" y="200" fill="#4a625f" font-family="system-ui,sans-serif" font-size="9">DATE OF BIRTH</text><text x="36" y="215" fill="#072b27" font-family="system-ui,sans-serif" font-size="12" font-weight="700">${esc(p.dateOfBirth)}</text><g transform="translate(196 180) scale(0.9)">${qr.replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g><text x="36" y="330" fill="#4a625f" font-family="system-ui,sans-serif" font-size="9">EMERGENCY CONTACT</text><text x="36" y="346" fill="#072b27" font-family="system-ui,sans-serif" font-size="11" font-weight="700">${esc(p.emergencyContactName ? `${p.emergencyContactName} (${p.emergencyContactRelationship || "—"})` : "Not on file")}</text><text x="24" y="450" fill="#8dd4ca" font-family="system-ui,sans-serif" font-size="8">Fictional demonstration card. Not a valid identity document.</text></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url; a.download = `clanclast-demo-card-${humanetId}.svg`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 500),
  team: () => call(() => { const db = read(); const p = me(db); return db.careTeam.filter((c) => c.patientId === p.id).sort((a, b) => Date.parse(b.connectedAt) - Date.parse(a.connectedAt)).map((m) => ({ id: m.id, label: m.label, role: m.role, status: m.status, connectedAt: m.connectedAt })); }),
  consent: () => call(() => write((db) => {
    expireConsents(db);
    const p = me(db);
    return db.consents.filter((c) => c.patientId === p.id).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map((c) => ({
      id: c.id, organization: org(db, c.orgId).name, provider: providerById(db, c.providerId).fullName, scope: c.scope, reason: c.reason, status: c.status,
      duration: c.duration, createdAt: c.createdAt, respondedAt: c.respondedAt, expiresAt: c.expiresAt, revokedAt: c.revokedAt,
    }));
  })),
  approveConsent: (id: string, duration: "ONCE" | "SEVEN_DAYS" | "UNTIL_REVOKED") => call(() => write((db) => {
    const p = me(db);
    const c = db.consents.find((x) => x.id === id && x.patientId === p.id);
    if (!c) throw new DemoError(404, "Consent request not found");
    if (c.status !== "PENDING") throw new DemoError(409, `Request is already ${c.status.toLowerCase()}`);
    c.status = "APPROVED"; c.duration = duration; c.respondedAt = now();
    c.expiresAt = duration === "SEVEN_DAYS" ? new Date(Date.now() + 7 * 864e5).toISOString() : duration === "ONCE" ? new Date(Date.now() + 3_600_000).toISOString() : null;
    const ref = db.referrals.find((r) => r.consentId === c.id);
    if (ref) ref.status = "SENT";
    ensureCareTeam(db, p.id, c.orgId, c.providerId, "Connected via consent");
    logActivity(db, { orgId: c.orgId, actorType: "PATIENT", actorLabel: p.fullName, action: "Consent approved", subjectLabel: `${org(db, c.orgId).name} · ${c.scope.join(", ")}`, status: duration === "UNTIL_REVOKED" ? "Approved · until revoked" : duration === "SEVEN_DAYS" ? "Approved · 7 days" : "Approved · once" });
    return { id: c.id, status: c.status, duration: c.duration, expiresAt: c.expiresAt };
  })),
  declineConsent: (id: string) => call(() => write((db) => {
    const p = me(db);
    const c = db.consents.find((x) => x.id === id && x.patientId === p.id);
    if (!c) throw new DemoError(404, "Consent request not found");
    if (c.status !== "PENDING") throw new DemoError(409, `Request is already ${c.status.toLowerCase()}`);
    c.status = "DECLINED"; c.respondedAt = now();
    logActivity(db, { orgId: c.orgId, actorType: "PATIENT", actorLabel: p.fullName, action: "Consent declined", subjectLabel: org(db, c.orgId).name, status: "Declined" });
    return { id: c.id, status: c.status };
  })),
  revokeConsent: (id: string) => call(() => write((db) => {
    const p = me(db);
    const c = db.consents.find((x) => x.id === id && x.patientId === p.id);
    if (!c) throw new DemoError(404, "Consent request not found");
    if (c.status !== "APPROVED") throw new DemoError(409, "Only approved access can be revoked");
    c.status = "REVOKED"; c.revokedAt = now();
    logActivity(db, { orgId: c.orgId, actorType: "PATIENT", actorLabel: p.fullName, action: "Consent revoked", subjectLabel: org(db, c.orgId).name, status: "Revoked" });
    return { id: c.id, status: c.status };
  })),
  notifications: () => call(() => { const db = read(); const p = me(db); return db.notifications.filter((n) => n.patientId === p.id).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)); }),
  markNotificationRead: (id: string) => call(() => write((db) => { const p = me(db); const n = db.notifications.find((x) => x.id === id && x.patientId === p.id); if (!n) throw new DemoError(404, "Notification not found"); n.read = true; return n; })),
  settings: () => call(() => settingsView(me(read()))),
  updateProfile: (payload: Record<string, unknown>) => call(() => write((db) => {
    const p = me(db) as Record<string, unknown> & Patient;
    for (const k of ["emergencyContactName", "emergencyContactRelationship", "email", "language", "largeText", "defaultConsentDuration", "notifyActionRequired", "notifyImportant", "notifyInformational"]) if (k in payload) p[k] = payload[k];
    return settingsView(p);
  })),
  organizations: () => call(() => read().orgs.slice().sort((a, b) => a.name.localeCompare(b.name)).map((o) => ({ id: o.id, name: o.name, type: o.type, status: o.status }))),
  connectOrganization: (organizationId: string) => call(() => write((db) => {
    const p = me(db);
    const o = db.orgs.find((x) => x.id === organizationId);
    if (!o) throw new DemoError(404, "Organisation not found");
    if (db.careTeam.some((c) => c.patientId === p.id && c.orgId === o.id)) throw new DemoError(409, "Already connected to this organisation");
    ensureCareTeam(db, p.id, o.id, null, "Connected by patient");
    logActivity(db, { orgId: o.id, actorType: "PATIENT", actorLabel: p.fullName, action: "Connected to provider", subjectLabel: o.name, status: "Connected" });
    const m = db.careTeam.find((c) => c.patientId === p.id && c.orgId === o.id)!;
    return { id: m.id, label: m.label, role: m.role, status: m.status };
  })),
  caregivers: () => call(() => { const db = read(); const p = me(db); return db.caregivers.filter((c) => c.patientId === p.id).map((c) => ({ id: c.id, name: c.name, relationship: c.relationship, phone: c.phone, canSignIn: !!(c.phone && c.pin), createdAt: c.createdAt })); }),
  addCaregiver: (payload: { name: string; relationship: string; phone?: string; pin?: string }) => call(() => write((db) => {
    const p = me(db);
    if (payload.pin && !payload.phone) throw new DemoError(400, "A phone number is required to set a sign-in PIN");
    const phone = payload.phone ? mobileKey(payload.phone) : null;
    if (phone && db.caregivers.some((c) => c.phone === phone)) throw new DemoError(409, "A caregiver with that phone number already exists");
    const c = { id: uid("cg"), patientId: p.id, name: payload.name, relationship: payload.relationship, phone, pin: payload.pin ?? null, createdAt: now() };
    db.caregivers.push(c);
    return { id: c.id, name: c.name, relationship: c.relationship, phone: c.phone, canSignIn: !!(c.phone && c.pin) };
  })),
  removeCaregiver: (id: string) => call(() => write((db) => { const p = me(db); const i = db.caregivers.findIndex((c) => c.id === id && c.patientId === p.id); if (i < 0) throw new DemoError(404, "Caregiver not found"); db.caregivers.splice(i, 1); return { ok: true }; })),
  accessLog: () => call(async () => {
    const db = read();
    const p = me(db);
    const rows = db.access.filter((a) => a.patientId === p.id).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    let prev = "0".repeat(64);
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const a = rows[i];
      const chain = { v: 1, seq: i + 1, prevHash: prev, hash: "", patientId: p.id, organizationId: a.orgId, providerId: a.providerId };
      chain.hash = await sha256(JSON.stringify([chain.v, chain.seq, chain.prevHash, chain.patientId, chain.organizationId, chain.providerId, a.action, a.isEmergency, a.reason ?? null, new Date(a.createdAt).toISOString()]));
      prev = chain.hash;
      out.push({ id: a.id, organization: org(db, a.orgId).name, provider: providerById(db, a.providerId).fullName, action: a.action, isEmergency: a.isEmergency, reason: a.reason, acknowledgedByPatient: a.acknowledgedByPatient, createdAt: a.createdAt, chain });
    }
    return out.reverse();
  }),
  acknowledgeAccess: (id: string) => call(() => write((db) => { const p = me(db); const a = db.access.find((x) => x.id === id && x.patientId === p.id); if (!a) throw new DemoError(404, "Access log entry not found"); a.acknowledgedByPatient = true; return { id: a.id, acknowledgedByPatient: true }; })),
};

function settingsView(p: Patient) {
  return {
    fullName: p.fullName, humanetId: p.humanetId, emergencyContactName: p.emergencyContactName, emergencyContactRelationship: p.emergencyContactRelationship,
    email: p.email, language: p.language, largeText: p.largeText, defaultConsentDuration: p.defaultConsentDuration,
    notifyActionRequired: p.notifyActionRequired, notifyImportant: p.notifyImportant, notifyInformational: p.notifyInformational, passportCompletion: completion(p),
  };
}
function svgUrl(text: string) {
  const svg = renderSVG(text, { border: 1, whiteColor: "#ffffff", blackColor: "#072b27" });
  return URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
}
async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ------------------------------------------------------------------ Trust Registry & signed summaries */

export type RegistryKey = { kid: string; alg: "EdDSA"; status: string; publicKeyJwk: { kty: string; crv: string; x: string } };
export type RegistryIssuer = { id: string; name: string; kind: "SYNTHETIC" | "INSTITUTION"; status: string; note?: string; keys: RegistryKey[] };
export type TrustRegistry = { version: number; generatedAt: string; summaryFormat: string; issuers: RegistryIssuer[]; revocations: { id: string; revokedAt: string }[] };
export type IssuedSummary = { id: string; jws: string; tier: 1 | 2; version: number; issuedAt: string; expiresAt: string };
export type SummaryIssuance = { id: string; issuerId: string; tier: 1 | 2; version: number; synthetic: boolean; issuedAt: string; expiresAt: string; revokedAt: string | null; revokedReason: string | null };

const TTL_DAYS: Record<1 | 2, number> = { 1: 90, 2: 30 };

/** Fixed, clearly synthetic clinical content for the demo issuer. */
function syntheticContent(seed: string, tier: 1 | 2) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pick = <T,>(xs: T[]) => xs[(h = (h * 1103515245 + 12345) >>> 0) % xs.length];
  const t1 = {
    bloodGroup: pick(["O+", "A+", "B+", "AB+", "O−", "A−"]),
    allergies: [pick(["Penicillin — rash (moderate)", "Sulfonamides — hives (mild)", "No known drug allergies"])],
    chronicConditions: [pick(["Hypertension, controlled", "Type 2 diabetes, diet-managed", "Asthma, intermittent"])],
    currentMedication: [pick(["Amlodipine 5 mg, once daily", "Metformin 500 mg, twice daily", "Salbutamol inhaler, as needed"])],
    alerts: [pick(["None recorded", "Fall risk — use assistance", "Latex sensitivity"])],
  };
  if (tier === 1) return t1;
  return {
    ...t1,
    recentDiagnoses: [pick(["Acute bronchitis (resolved)", "Sprained left ankle", "Iron-deficiency anaemia"])],
    procedures: [pick(["Chest X-ray — no acute findings", "ECG — sinus rhythm", "None in the last 12 months"])],
    keyResults: [{ name: "HbA1c", value: pick(["5.4", "6.1", "6.8"]), unit: "%", date: "synthetic" }, { name: "Blood pressure", value: pick(["128/82", "134/86", "118/76"]), unit: "mmHg", date: "synthetic" }],
    activeReferrals: [pick(["None", "Cardiology outpatient review", "Dietitian follow-up"])],
  };
}

export const trustApi = {
  registry: () => call(() => registry() as Promise<TrustRegistry>, 120),
  issued: () => call(() => { const db = read(); const p = me(db); return db.issuances.filter((i) => i.patientId === p.id).sort((a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt)).map(({ patientId, keyId, ...i }) => i as SummaryIssuance); }),
  issueSynthetic: (tier: 1 | 2) => call(async () => {
    const p = me(read());
    const key = await activeKey(null);
    const version = read().issuances.filter((i) => i.patientId === p.id && i.tier === tier && i.issuerId === SYNTHETIC_ISSUER.id).length + 1;
    const id = `urn:uuid:${crypto.randomUUID()}`;
    const t = new Date();
    const expiresAt = new Date(t.getTime() + TTL_DAYS[tier] * 86_400_000);
    const jws = await signVcJwt(key, {
      iss: SYNTHETIC_ISSUER.id, sub: p.humanetId, jti: id, iat: Math.floor(t.getTime() / 1000), nbf: Math.floor(t.getTime() / 1000), exp: Math.floor(expiresAt.getTime() / 1000),
      vc: {
        "@context": ["https://www.w3.org/ns/credentials/v2"], type: ["VerifiableCredential", "ClanclastPatientSummary"], credentialSchema: { id: SUMMARY_FORMAT, type: "JsonSchema" },
        issuer: { id: SYNTHETIC_ISSUER.id, name: SYNTHETIC_ISSUER.name }, synthetic: true,
        credentialSubject: { id: p.humanetId, name: p.fullName, tier, version, asOf: t.toISOString(), advisory: "Snapshot as of the date shown. The issuing institution holds the authoritative record.", content: syntheticContent(`${p.id}:${tier}`, tier) },
      },
    });
    write((db) => { db.issuances.push({ id, patientId: p.id, issuerId: SYNTHETIC_ISSUER.id, keyId: key.kid, tier, version, synthetic: true, issuedAt: t.toISOString(), expiresAt: expiresAt.toISOString(), revokedAt: null, revokedReason: null }); });
    return { id, jws, tier, version, issuedAt: t.toISOString(), expiresAt: expiresAt.toISOString() } as IssuedSummary;
  }, 400),
  revoke: (id: string, reason: "LOST_DEVICE" | "SUPERSEDED" | "PATIENT_REQUEST") => call(() => write((db) => {
    const p = me(db);
    const row = db.issuances.find((i) => i.id === id && i.patientId === p.id);
    if (!row) throw new DemoError(404, "Summary not found");
    if (!row.revokedAt) { row.revokedAt = now(); row.revokedReason = reason; }
    return { id: row.id, revokedAt: row.revokedAt };
  })),
};
