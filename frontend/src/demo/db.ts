/**
 * The website's demonstration backend.
 *
 * The real CLANCLAST patient and provider apps run on this site unchanged, except
 * that their API clients call into this in-browser store instead of a server.
 * Everything is fictional, lives only in this browser (localStorage), and can be
 * reset at any time. Both apps share the store, so a consent request sent from the
 * provider workspace really does arrive in the patient app.
 *
 * What is deliberately NOT here: CLANCLAST's identity-resolution engine. The few
 * matching rules below exist only so the check-in screen has something to show.
 */
import { getPublicKeyAsync, signAsync } from "@noble/ed25519";

export const DEMO_KEY = "cc-demo-v1";

export class DemoError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

/* ------------------------------------------------------------------ types */

export type OrgType = "HOSPITAL" | "LABORATORY" | "PHARMACY" | "CLINIC";
export type Org = { id: string; name: string; type: OrgType; status: "CONNECTED" | "PENDING" | "SUSPENDED"; fhirGateway: boolean; gatewayUrl: string | null; lastSyncedAt: string | null };
export type Provider = { id: string; email: string; password: string; fullName: string; role: string; orgId: string };
export type Patient = {
  id: string; humanetId: string; fullName: string; dateOfBirth: string; nationalId: string; mobile: string; email: string | null; password: string; pin: string;
  identityVerified: boolean; registeredBy: "staff" | "patient"; createdAt: string;
  emergencyContactName: string | null; emergencyContactRelationship: string | null;
  language: string; largeText: boolean; defaultConsentDuration: "ONCE" | "SEVEN_DAYS" | "UNTIL_REVOKED";
  notifyActionRequired: boolean; notifyImportant: boolean; notifyInformational: boolean;
};
export type CareTeam = { id: string; patientId: string; orgId: string; providerId: string | null; label: string; role: string; status: string; connectedAt: string };
export type Consent = {
  id: string; patientId: string; orgId: string; providerId: string; scope: string[]; reason: string | null;
  status: "PENDING" | "APPROVED" | "DECLINED" | "REVOKED" | "EXPIRED"; duration: "ONCE" | "SEVEN_DAYS" | "UNTIL_REVOKED" | null;
  createdAt: string; respondedAt: string | null; expiresAt: string | null; revokedAt: string | null;
};
export type Referral = { id: string; patientId: string; fromProviderId: string; toOrgId: string; reason: string; urgency: string; status: string; consentId: string; createdAt: string };
export type Notification = { id: string; patientId: string; category: "ACTION_REQUIRED" | "IMPORTANT" | "INFORMATIONAL"; title: string; body: string | null; read: boolean; createdAt: string };
export type Access = { id: string; patientId: string; orgId: string; providerId: string; action: string; isEmergency: boolean; reason: string | null; acknowledgedByPatient: boolean; createdAt: string; seq: number };
export type ActivityRow = { id: string; orgId: string; actorType: string; actorLabel: string; action: string; subjectLabel: string; status: string; createdAt: string };
export type Caregiver = { id: string; patientId: string; name: string; relationship: string; phone: string | null; pin: string | null; createdAt: string };
export type Credential = { id: string; patientId: string; type: string; status: string; issuerOrgId: string; issuedAt: string };
export type Connection = { id: string; fromOrgId: string; toOrgId: string; requestedByProviderId: string; message: string | null; status: "PENDING" | "ACCEPTED" | "DECLINED"; createdAt: string };
export type SyncEvent = { id: string; orgId: string; status: string; message: string; createdAt: string };
export type Endpoint = { id: string; orgId: string; label: string; kind: string; baseUrl: string; role: "PRIMARY" | "REPLICA"; status: "UP" | "DEGRADED" | "DOWN" | "UNKNOWN"; lastCheckedAt: string | null; lastLatencyMs: number | null; lastError: string | null; fhirVersion: string | null; createdAt: string };
export type Key = { kid: string; orgId: string | null; seed: string; x: string; createdAt: string; retiredAt: string | null; revokedAt: string | null };
export type Issuance = { id: string; patientId: string; issuerId: string; keyId: string; tier: 1 | 2; version: number; synthetic: boolean; issuedAt: string; expiresAt: string; revokedAt: string | null; revokedReason: string | null };

export type DB = {
  v: 1;
  orgs: Org[]; providers: Provider[]; patients: Patient[]; careTeam: CareTeam[]; consents: Consent[]; referrals: Referral[];
  notifications: Notification[]; access: Access[]; activity: ActivityRow[]; caregivers: Caregiver[]; credentials: Credential[];
  connections: Connection[]; syncEvents: SyncEvent[]; endpoints: Endpoint[]; keys: Key[]; issuances: Issuance[];
};

/* ------------------------------------------------------------------ helpers */

export const now = () => new Date().toISOString();
const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();
export const days = (n: number) => n * 1440;
let counter = 0;
export const uid = (p: string) => `${p}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const pause = <T,>(v: T, ms = 180) => new Promise<T>((r) => setTimeout(() => r(v), ms + Math.random() * 120));
export const fail = (status: number, message: string): Promise<never> => new Promise((_, rej) => setTimeout(() => rej(new DemoError(status, message)), 200));
export const digits = (s = "") => s.replace(/\D/g, "");
/** Any SA mobile format → +27XXXXXXXXX. */
export const mobileKey = (s = "") => { const d = digits(s); return d.startsWith("27") ? `+${d}` : d.startsWith("0") ? `+27${d.slice(1)}` : d ? `+${d}` : ""; };
export const b64url = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const hex = (u: Uint8Array) => [...u].map((b) => b.toString(16).padStart(2, "0")).join("");
const unhex = (h: string) => Uint8Array.from(h.match(/../g)!.map((b) => parseInt(b, 16)));
export function newHumanetId(db: DB) {
  for (;;) {
    const id = `CC-${1000 + Math.floor(Math.random() * 9000)}-${1000 + Math.floor(Math.random() * 9000)}`;
    if (!db.patients.some((p) => p.humanetId === id)) return id;
  }
}

/* ------------------------------------------------------------------ seed (all fictional) */

function seed(): DB {
  const P = (id: string, humanetId: string, fullName: string, dateOfBirth: string, nationalId: string, mobile: string, o: Partial<Patient> = {}): Patient => ({
    id, humanetId, fullName, dateOfBirth, nationalId, mobile, email: null, password: "Patient123!", pin: "0000",
    identityVerified: true, registeredBy: "staff", createdAt: ago(days(200)), emergencyContactName: null, emergencyContactRelationship: null,
    language: "English", largeText: false, defaultConsentDuration: "SEVEN_DAYS", notifyActionRequired: true, notifyImportant: true, notifyInformational: true, ...o,
  });
  const db: DB = {
    v: 1,
    orgs: [
      { id: "org_riverside", name: "Riverside General Hospital", type: "HOSPITAL", status: "CONNECTED", fhirGateway: true, gatewayUrl: "https://fhir.riverside.demo/r4", lastSyncedAt: ago(42) },
      { id: "org_northgate", name: "Northgate Laboratory", type: "LABORATORY", status: "CONNECTED", fhirGateway: true, gatewayUrl: "https://fhir.northgate.demo/r4", lastSyncedAt: ago(95) },
      { id: "org_lakeside", name: "Lakeside Community Clinic", type: "CLINIC", status: "CONNECTED", fhirGateway: false, gatewayUrl: null, lastSyncedAt: ago(days(1)) },
      { id: "org_hillcrest", name: "Hillcrest Pharmacy", type: "PHARMACY", status: "PENDING", fhirGateway: false, gatewayUrl: null, lastSyncedAt: null },
      { id: "org_eastbay", name: "Eastbay Maternity Centre", type: "HOSPITAL", status: "CONNECTED", fhirGateway: true, gatewayUrl: "https://fhir.eastbay.demo/r4", lastSyncedAt: ago(300) },
    ],
    providers: [
      { id: "pr_naidoo", email: "dr.naidoo@riverside.demo", password: "Provider123!", fullName: "Dr. Priya Naidoo", role: "Physician", orgId: "org_riverside" },
      { id: "pr_dube", email: "n.dube@lakeside.demo", password: "Provider123!", fullName: "Sister Nomvula Dube", role: "Professional nurse", orgId: "org_lakeside" },
      { id: "pr_vanwyk", email: "lab@northgate.demo", password: "Provider123!", fullName: "Kobus van Wyk", role: "Laboratory manager", orgId: "org_northgate" },
    ],
    patients: [
      P("pt_thandiwe", "CC-4821-1990", "Thandiwe Mokoena", "1990-03-12", "9003120245085", "+27825550198", { email: "thandiwe@example.com", pin: "2580", emergencyContactName: "Sipho Mokoena", emergencyContactRelationship: "Brother", registeredBy: "patient", createdAt: ago(days(400)) }),
      P("pt_bongani", "CC-3307-1984", "Bongani Dlamini", "1984-07-02", "8407025309082", "+27731110022", { emergencyContactName: "Zanele Dlamini", emergencyContactRelationship: "Wife" }),
      P("pt_annelie", "CC-5512-1971", "Annelie van der Merwe", "1971-11-23", "7111230176083", "+27614447788"),
      P("pt_thabo", "CC-2290-2001", "Thabo Nkosi", "2001-05-17", "0105175822089", "+27795551234", { identityVerified: false, registeredBy: "patient", createdAt: ago(days(2)) }),
      P("pt_ayesha", "CC-7719-1995", "Ayesha Patel", "1995-09-30", "9509300487086", "+27823330044", { emergencyContactName: "Imran Patel", emergencyContactRelationship: "Father" }),
      P("pt_lerato", "CC-6034-1988", "Lerato Mahlangu", "1988-01-08", "8801080899087", "+27662220099"),
      P("pt_johan", "CC-1145-1966", "Johan Botha", "1966-04-25", "6604255066081", "+27834441122", { identityVerified: false, createdAt: ago(days(6)) }),
      P("pt_thandi2", "CC-9026-1990", "Thandi Mokoena", "1990-12-03", "9012030339087", "+27829990011"),
    ],
    careTeam: [],
    consents: [],
    referrals: [],
    notifications: [],
    access: [],
    activity: [],
    caregivers: [{ id: "cg_sipho", patientId: "pt_thandiwe", name: "Sipho Mokoena", relationship: "Brother", phone: "+27825550199", pin: "1234", createdAt: ago(days(90)) }],
    credentials: [
      { id: "cred_vacc_thandiwe", patientId: "pt_thandiwe", type: "COVID-19 vaccination", status: "Verified", issuerOrgId: "org_lakeside", issuedAt: ago(days(300)) },
    ],
    connections: [
      { id: "cn_lakeside", fromOrgId: "org_lakeside", toOrgId: "org_riverside", requestedByProviderId: "pr_dube", message: "Referral pathway for maternity and chronic care follow-up", status: "PENDING", createdAt: ago(days(1)) },
      { id: "cn_northgate", fromOrgId: "org_riverside", toOrgId: "org_northgate", requestedByProviderId: "pr_naidoo", message: null, status: "ACCEPTED", createdAt: ago(days(60)) },
      { id: "cn_eastbay", fromOrgId: "org_eastbay", toOrgId: "org_riverside", requestedByProviderId: "pr_naidoo", message: null, status: "ACCEPTED", createdAt: ago(days(30)) },
    ],
    syncEvents: [
      { id: uid("se"), orgId: "org_northgate", status: "success", message: "Connection check passed", createdAt: ago(95) },
      { id: uid("se"), orgId: "org_eastbay", status: "success", message: "Connection check passed", createdAt: ago(300) },
    ],
    endpoints: [
      { id: "ep_riv_primary", orgId: "org_riverside", label: "Hospital information system", kind: "FHIR_R4", baseUrl: "https://fhir.riverside.demo/r4", role: "PRIMARY", status: "UP", lastCheckedAt: ago(4), lastLatencyMs: 182, lastError: null, fhirVersion: "4.0.1", createdAt: ago(days(60)) },
      { id: "ep_riv_replica", orgId: "org_riverside", label: "Read-only standby", kind: "FHIR_R4", baseUrl: "https://standby.riverside.demo/r4", role: "REPLICA", status: "UP", lastCheckedAt: ago(4), lastLatencyMs: 240, lastError: null, fhirVersion: "4.0.1", createdAt: ago(days(60)) },
      { id: "ep_ng_primary", orgId: "org_northgate", label: "Laboratory system", kind: "FHIR_R4", baseUrl: "https://fhir.northgate.demo/r4", role: "PRIMARY", status: "UP", lastCheckedAt: ago(6), lastLatencyMs: 131, lastError: null, fhirVersion: "4.0.1", createdAt: ago(days(60)) },
      { id: "ep_eb_primary", orgId: "org_eastbay", label: "Maternity records", kind: "FHIR_R4", baseUrl: "https://fhir.eastbay.demo/r4", role: "PRIMARY", status: "DEGRADED", lastCheckedAt: ago(8), lastLatencyMs: 2410, lastError: "Slow response", fhirVersion: "4.0.1", createdAt: ago(days(30)) },
    ],
    keys: [],
    issuances: [],
  };
  const team = (patientId: string, orgId: string, role: string, mins: number, providerId: string | null = null) =>
    db.careTeam.push({ id: uid("ct"), patientId, orgId, providerId, label: db.orgs.find((o) => o.id === orgId)!.name, role, status: "Trusted", connectedAt: ago(mins) });
  for (const p of db.patients) if (p.id !== "pt_thandi2") team(p.id, "org_riverside", "Registered at reception", days(30 + p.fullName.length));
  team("pt_thandiwe", "org_lakeside", "Connected by patient", days(200));
  team("pt_thandiwe", "org_northgate", "Connected via consent", days(12), "pr_vanwyk");
  team("pt_thandi2", "org_lakeside", "Registered at reception", days(80));

  const consent = (patientId: string, orgId: string, providerId: string, scope: string[], reason: string | null, status: Consent["status"], mins: number, duration: Consent["duration"] = null) => {
    const c: Consent = { id: uid("cs"), patientId, orgId, providerId, scope, reason, status, duration, createdAt: ago(mins), respondedAt: status === "PENDING" ? null : ago(mins - 5), expiresAt: duration === "SEVEN_DAYS" ? new Date(Date.parse(ago(mins - 5)) + 7 * 864e5).toISOString() : null, revokedAt: null };
    db.consents.push(c);
    return c;
  };
  consent("pt_thandiwe", "org_lakeside", "pr_dube", ["Signed summaries", "Referral information"], "Antenatal follow-up visit", "PENDING", 18);
  consent("pt_thandiwe", "org_riverside", "pr_naidoo", ["Signed summaries"], "Outpatient review", "APPROVED", days(3), "SEVEN_DAYS");
  consent("pt_thandiwe", "org_northgate", "pr_vanwyk", ["Laboratory results"], null, "DECLINED", days(40));
  consent("pt_annelie", "org_riverside", "pr_naidoo", ["Signed summaries", "Emergency information"], "Pre-operative assessment", "PENDING", 25);
  consent("pt_bongani", "org_riverside", "pr_naidoo", ["Signed summaries"], "Chronic care review", "APPROVED", days(1), "UNTIL_REVOKED");

  const note = (patientId: string, category: Notification["category"], title: string, body: string | null, mins: number, read = false) =>
    db.notifications.push({ id: uid("nt"), patientId, category, title, body, read, createdAt: ago(mins) });
  note("pt_thandiwe", "ACTION_REQUIRED", "Lakeside Community Clinic is asking for access", "Signed summaries, referral information · Antenatal follow-up visit", 18);
  note("pt_thandiwe", "INFORMATIONAL", "Riverside General Hospital checked you in", null, days(3), true);
  note("pt_thandiwe", "INFORMATIONAL", "You approved access for Riverside General Hospital for 7 days", null, days(3) - 5, true);

  const access = (patientId: string, orgId: string, providerId: string, action: string, mins: number) =>
    db.access.push({ id: uid("al"), patientId, orgId, providerId, action, isEmergency: false, reason: null, acknowledgedByPatient: false, createdAt: ago(mins), seq: 0 });
  access("pt_thandiwe", "org_northgate", "pr_vanwyk", "Verified identity", days(40));
  access("pt_thandiwe", "org_riverside", "pr_naidoo", "Checked you in", days(3));
  access("pt_thandiwe", "org_riverside", "pr_naidoo", "Viewed your CLANCLAST profile", days(3) - 10);

  const act = (orgId: string, actorLabel: string, action: string, subjectLabel: string, status: string, mins: number, actorType = "PROVIDER") =>
    db.activity.push({ id: uid("ac"), orgId, actorType, actorLabel, action, subjectLabel, status, createdAt: ago(mins) });
  act("org_riverside", "Reception", "Patient checked in", "Bongani Dlamini", "Identity verified", 55);
  act("org_riverside", "Reception", "Patient checked in", "Ayesha Patel", "Identity verified", 32);
  act("org_riverside", "Dr. Priya Naidoo", "Consent requested", "Annelie van der Merwe", "Pending", 25);
  act("org_riverside", "Thabo Nkosi", "Self-registered", "CC-2290-2001", "Identity check pending", days(2), "PATIENT");
  act("org_riverside", "Dr. Priya Naidoo", "Duplicate registration prevented", "Lerato Mahlangu", "Existing ID used", days(1));
  act("org_riverside", "Bongani Dlamini", "Consent approved", "Riverside General Hospital · Signed summaries", "Approved · until revoked", days(1), "PATIENT");
  return db;
}

/* ------------------------------------------------------------------ store */

let cache: DB | null = null;
function load(): DB {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) { const d = JSON.parse(raw) as DB; if (d?.v === 1) return d; }
  } catch { /* storage blocked: fall back to memory */ }
  const d = seed();
  persist(d);
  return d;
}
function persist(d: DB) { try { localStorage.setItem(DEMO_KEY, JSON.stringify(d)); } catch { /* memory only */ } }

/** Read the latest state (another tab or frame may have changed it). */
export function read(): DB {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) { cache = JSON.parse(raw); return cache!; }
  } catch { /* ignore */ }
  return (cache ??= load());
}
/** Change state and save it for the other app. */
export function write<T>(fn: (db: DB) => T): T {
  const db = read();
  const out = fn(db);
  persist(db);
  cache = db;
  return out;
}
export function resetDemo() {
  try {
    for (const k of Object.keys(localStorage)) if (k === DEMO_KEY || k.startsWith("cc-") || k.startsWith("cc_") || k.startsWith("humanet_")) localStorage.removeItem(k);
  } catch { /* ignore */ }
  try { indexedDB.deleteDatabase("clanclast-vault"); } catch { /* ignore */ }
  cache = null;
}

/* ------------------------------------------------------------------ shared domain helpers */

export const org = (db: DB, id: string) => db.orgs.find((o) => o.id === id)!;
export const patientById = (db: DB, id: string) => { const p = db.patients.find((x) => x.id === id); if (!p) throw new DemoError(404, "Patient not found"); return p; };
export const providerById = (db: DB, id: string) => { const p = db.providers.find((x) => x.id === id); if (!p) throw new DemoError(401, "Your demo session has ended. Please sign in again."); return p; };

export function logActivity(db: DB, row: Omit<ActivityRow, "id" | "createdAt">) {
  db.activity.unshift({ ...row, id: uid("ac"), createdAt: now() });
}
export function addAccess(db: DB, row: { patientId: string; orgId: string; providerId: string; action: string; isEmergency?: boolean; reason?: string | null }) {
  db.access.push({ id: uid("al"), acknowledgedByPatient: false, createdAt: now(), seq: 0, ...row, isEmergency: row.isEmergency ?? false, reason: row.reason ?? null });
}
export function notify(db: DB, patientId: string, category: Notification["category"], title: string, body: string | null = null) {
  db.notifications.unshift({ id: uid("nt"), patientId, category, title, body, read: false, createdAt: now() });
}
export function ensureCareTeam(db: DB, patientId: string, orgId: string, providerId: string | null, role: string) {
  if (db.careTeam.some((c) => c.patientId === patientId && c.orgId === orgId)) return;
  db.careTeam.push({ id: uid("ct"), patientId, orgId, providerId, label: org(db, orgId).name, role, status: "Trusted", connectedAt: now() });
}
export function expireConsents(db: DB) {
  const t = Date.now();
  for (const c of db.consents) if (c.status === "APPROVED" && c.expiresAt && Date.parse(c.expiresAt) <= t) c.status = "EXPIRED";
}
export const activeConsent = (db: DB, patientId: string, orgId: string) =>
  db.consents.filter((c) => c.patientId === patientId && c.orgId === orgId && c.status === "APPROVED" && (!c.expiresAt || Date.parse(c.expiresAt) > Date.now()))
    .sort((a, b) => Date.parse(b.respondedAt ?? b.createdAt) - Date.parse(a.respondedAt ?? a.createdAt))[0] ?? null;

/* ------------------------------------------------------------------ signing (Ed25519, in this browser) */

export const SUMMARY_FORMAT = "https://clanclast.health/schemas/patient-summary/v1";
export const SYNTHETIC_ISSUER = { id: "clanclast:issuer:synthetic-demo-hospital", name: "Synthetic Demo Hospital", kind: "SYNTHETIC" as const, note: "Demonstration issuer. Signs synthetic data only. Not a healthcare provider." };
export const issuerIdFor = (orgId: string) => `clanclast:issuer:org:${orgId}`;

/**
 * Demo keys are derived from public labels, so every visitor's browser has the same demo
 * Trust Registry and a summary issued on one device verifies on another. They sign
 * fictional data only; production keys are random and never leave the issuer.
 */
async function makeKey(orgId: string | null, n: number): Promise<Key> {
  const priv = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`clanclast-website-demo-key:${orgId ?? "synthetic"}:${n}`)));
  const pub = await getPublicKeyAsync(priv);
  const x = b64url(pub);
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(x));
  return { kid: b64url(new Uint8Array(d)).slice(0, 16), orgId, seed: hex(priv), x, createdAt: now(), retiredAt: null, revokedAt: null };
}
/** The active signing key for an organisation (null = the synthetic demo issuer), created on first use. */
export async function activeKey(orgId: string | null): Promise<Key> {
  const existing = read().keys.find((k) => k.orgId === orgId && !k.retiredAt && !k.revokedAt);
  if (existing) return existing;
  const k = await makeKey(orgId, read().keys.filter((x) => x.orgId === orgId).length);
  write((db) => { if (!db.keys.some((x) => x.orgId === orgId && !x.retiredAt && !x.revokedAt)) db.keys.unshift(k); });
  return read().keys.find((x) => x.orgId === orgId && !x.retiredAt && !x.revokedAt)!;
}
export async function rotateKey(orgId: string): Promise<Key> {
  const k = await makeKey(orgId, read().keys.filter((x) => x.orgId === orgId).length);
  write((db) => { for (const x of db.keys) if (x.orgId === orgId && !x.retiredAt && !x.revokedAt) x.retiredAt = now(); db.keys.unshift(k); });
  return k;
}
export async function signVcJwt(key: Key, payload: Record<string, unknown>) {
  const enc = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const input = `${enc({ alg: "EdDSA", typ: "vc+jwt", kid: key.kid })}.${enc(payload)}`;
  const sig = await signAsync(new TextEncoder().encode(input), unhex(key.seed));
  return `${input}.${b64url(sig)}`;
}
export const fingerprint = (x: string) => x.slice(0, 32).match(/.{1,4}/g)!.join(" ");

/** The public Trust Registry: issuers, public keys and revocations. No patient or clinical data. */
export async function registry() {
  await activeKey(null);
  const db = read();
  const synth = db.keys.filter((k) => k.orgId === null);
  const orgIds = [...new Set(db.keys.filter((k) => k.orgId).map((k) => k.orgId!))];
  const keyView = (k: Key) => ({ kid: k.kid, alg: "EdDSA" as const, status: k.revokedAt ? "REVOKED" : k.retiredAt ? "RETIRED" : "ACTIVE", publicKeyJwk: { kty: "OKP", crv: "Ed25519", x: k.x } });
  return {
    version: 1,
    generatedAt: now(),
    summaryFormat: SUMMARY_FORMAT,
    issuers: [
      { ...SYNTHETIC_ISSUER, status: "ACTIVE", keys: synth.map(keyView) },
      ...orgIds.map((id) => {
        const o = org(db, id);
        return { id: issuerIdFor(id), name: o.name, kind: "INSTITUTION" as const, institutionType: o.type, status: o.status === "CONNECTED" ? "ACTIVE" : "SUSPENDED", keys: db.keys.filter((k) => k.orgId === id).map(keyView) };
      }),
    ],
    revocations: db.issuances.filter((i) => i.revokedAt).map((i) => ({ id: i.id, revokedAt: i.revokedAt! })),
  };
}

/* ------------------------------------------------------------------ illustrative matching (not the CLANCLAST engine) */

const norm = (s = "") => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();

export function demoMatches(db: DB, q: { fullName: string; dateOfBirth?: string; mobile?: string; nationalId?: string }) {
  const qn = norm(q.fullName).split(" ");
  const out: { patient: Patient; tier: "auto_link" | "escalate"; overallScore: number; explanation: string[] }[] = [];
  for (const p of db.patients) {
    const pn = norm(p.fullName).split(" ");
    const sameName = qn.join(" ") === pn.join(" ");
    const sameSurname = qn[qn.length - 1] === pn[pn.length - 1];
    const sameFirst = !!qn[0] && !!pn[0] && (pn[0].startsWith(qn[0]) || qn[0].startsWith(pn[0]));
    const dob = !!q.dateOfBirth && q.dateOfBirth === p.dateOfBirth;
    const mob = !!q.mobile && mobileKey(q.mobile) === p.mobile;
    const nid = !!q.nationalId && digits(q.nationalId) === p.nationalId;
    const why: string[] = [];
    if (sameName) why.push("Name agrees"); else if (sameSurname && sameFirst) why.push("Name is similar");
    if (dob) why.push("Date of birth agrees"); else if (q.dateOfBirth) why.push("Date of birth differs");
    if (mob) why.push("Mobile number agrees");
    if (nid) why.push("ID number agrees");
    const strong = [dob, mob, nid].filter(Boolean).length;
    if (sameName && strong >= 1 || nid && (sameName || sameSurname)) out.push({ patient: p, tier: "auto_link", overallScore: 0.97, explanation: why });
    else if ((sameName || (sameSurname && sameFirst)) || strong >= 2) out.push({ patient: p, tier: "escalate", overallScore: 0.8, explanation: why.length ? why : ["Some details agree"] });
  }
  return out.sort((a, b) => (a.tier === b.tier ? 0 : a.tier === "auto_link" ? -1 : 1)).slice(0, 5);
}
