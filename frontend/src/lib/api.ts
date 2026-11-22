/**
 * Demonstration data layer for the public website.
 *
 * Every prototype screen on this site runs entirely in the visitor's browser
 * against the simulated data below. Nothing is sent to a server, nothing is
 * stored beyond this browser tab, and none of CLANCLAST's production logic is
 * included: the "matching" used by the check-in demo is a deliberately simple
 * stand-in for illustration only.
 *
 * The function names mirror what the screens call so each workflow still
 * behaves like the real product, but the data is fictional and resets when the
 * page is reloaded.
 */

type Session = "patient" | "provider" | "caregiver";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/* ------------------------------------------------------------------ sessions */

const tokens = new Map<Session, string>();
const sessions = new Map<string, { kind: Session; id: string }>();

export function getToken(session: Session): string | null {
  return tokens.get(session) ?? null;
}
export function setToken(session: Session, token: string) {
  tokens.set(session, token);
}
export function clearToken(session: Session) {
  const t = tokens.get(session);
  if (t) sessions.delete(t);
  tokens.delete(session);
}

let seq = 1000;
const uid = (p: string) => `${p}_${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const now = () => new Date().toISOString();
const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();
const wait = <T,>(v: T, ms = 220) => new Promise<T>((r) => setTimeout(() => r(v), ms));
const fail = (status: number, message: string) => new Promise<never>((_, rej) => setTimeout(() => rej(new ApiError(status, message)), 220));
const digits = (s = "") => s.replace(/\D/g, "");
const phone = (s = "") => { const d = digits(s); return d.startsWith("27") ? `0${d.slice(2)}` : d; };
const norm = (s = "") => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
const ccId = () => `CC-${String(1000 + Math.floor(Math.random() * 9000))}-${String(1000 + Math.floor(Math.random() * 9000))}`;

function open(kind: Session, id: string) {
  const token = uid("demo");
  sessions.set(token, { kind, id });
  return token;
}
function who(kind: Session, token = tokens.get(kind)) {
  const s = token ? sessions.get(token) : undefined;
  if (!s || s.kind !== kind) throw new ApiError(401, "Your demo session has ended. Please sign in again.");
  return s.id;
}

/* ------------------------------------------------------------------ demo data (fictional) */

type Duration = "ONCE" | "SEVEN_DAYS" | "UNTIL_REVOKED";
type Org = { id: string; name: string; type: string; status: "CONNECTED" | "PENDING" | "ATTENTION"; lastSyncedAt?: string; syncEvents: { id: string; message: string; status: string; createdAt: string }[] };
type Consent = { id: string; patientId: string; orgId: string; provider: string; scope: string[]; reason?: string; status: "PENDING" | "APPROVED" | "DECLINED" | "REVOKED"; duration?: Duration; expiresAt?: string; createdAt: string; respondedAt?: string };
type Credential = { id: string; patientId: string; type: string; status: string; issuer: string; issuedAt: string };
type Patient = {
  id: string; ccId: string; fullName: string; dateOfBirth: string; nationalId: string; mobile: string; email?: string; password: string; pin: string;
  emergencyContactName?: string; emergencyContactRelationship?: string; allergies?: string; bloodType?: string;
  team: { orgId: string; connectedAt: string }[]; summaries: { id: string; title: string; issuer: string; version: number; issuedAt: string }[];
  settings: { defaultConsentDuration: Duration; notifyActionRequired: boolean; notifyImportant: boolean; notifyInformational: boolean; language: string; largeText: boolean };
  notifications: { id: string; title: string; category: string; read: boolean; createdAt: string }[];
  accessLog: { id: string; provider: string; organization: string; action: string; createdAt: string; isEmergency?: boolean; reason?: string; acknowledgedByPatient?: boolean }[];
  lastInteraction?: string;
};

const db = {
  orgs: [
    { id: "org_riverside", name: "Riverside General Hospital", type: "HOSPITAL", status: "CONNECTED", lastSyncedAt: ago(42), syncEvents: [{ id: uid("ev"), message: "Connection check passed", status: "success", createdAt: ago(42) }] },
    { id: "org_northgate", name: "Northgate Laboratory", type: "LABORATORY", status: "CONNECTED", lastSyncedAt: ago(95), syncEvents: [{ id: uid("ev"), message: "Connection check passed", status: "success", createdAt: ago(95) }] },
    { id: "org_lakeside", name: "Lakeside Community Clinic", type: "CLINIC", status: "PENDING", syncEvents: [] },
    { id: "org_hillcrest", name: "Hillcrest Pharmacy", type: "PHARMACY", status: "ATTENTION", lastSyncedAt: ago(60 * 26), syncEvents: [{ id: uid("ev"), message: "Connection check timed out", status: "warning", createdAt: ago(60 * 26) }] },
  ] as Org[],
  providers: [
    { id: "pr_naidoo", email: "dr.naidoo@riverside.demo", password: "Provider123!", fullName: "Dr. Priya Naidoo", role: "Physician", orgId: "org_riverside" },
  ],
  patients: [] as Patient[],
  consents: [] as Consent[],
  credentials: [] as Credential[],
  caregivers: [] as { id: string; patientId: string; name: string; relationship: string; phone?: string; pin?: string }[],
  connections: [
    { id: "cn_1", fromOrgId: "org_lakeside", toOrgId: "org_riverside", requestedBy: "Sister N. Dube", message: "Referral pathway for maternity follow-up", status: "PENDING" },
    { id: "cn_2", fromOrgId: "org_riverside", toOrgId: "org_northgate", requestedBy: "Dr. Priya Naidoo", status: "ACCEPTED" },
  ] as { id: string; fromOrgId: string; toOrgId: string; requestedBy: string; message?: string; status: "PENDING" | "ACCEPTED" | "DECLINED" }[],
  activity: [] as { id: string; orgId: string; actorLabel: string; action: string; subjectLabel: string; status: string; createdAt: string }[],
};

function defaultSettings(): Patient["settings"] {
  return { defaultConsentDuration: "SEVEN_DAYS", notifyActionRequired: true, notifyImportant: true, notifyInformational: true, language: "English", largeText: false };
}

(function seed() {
  const thandiwe: Patient = {
    id: "pt_thandiwe", ccId: "CC-4821-1990", fullName: "Thandiwe Mokoena", dateOfBirth: "1990-03-12", nationalId: "9003120000000", mobile: "0825550198",
    email: "thandiwe@example.com", password: "Patient123!", pin: "2580",
    emergencyContactName: "Sipho Mokoena", emergencyContactRelationship: "Brother", allergies: "Penicillin", bloodType: "O+",
    team: [{ orgId: "org_riverside", connectedAt: ago(60 * 24 * 40) }, { orgId: "org_northgate", connectedAt: ago(60 * 24 * 12) }],
    summaries: [
      { id: uid("sm"), title: "Discharge summary", issuer: "Riverside General Hospital", version: 2, issuedAt: ago(60 * 24 * 30) },
      { id: uid("sm"), title: "Laboratory summary", issuer: "Northgate Laboratory", version: 1, issuedAt: ago(60 * 24 * 9) },
    ],
    settings: defaultSettings(),
    notifications: [
      { id: uid("nt"), title: "Lakeside Community Clinic is asking for access", category: "ACTION_REQUIRED", read: false, createdAt: ago(18) },
      { id: uid("nt"), title: "Northgate Laboratory issued a signed summary", category: "INFORMATIONAL", read: true, createdAt: ago(60 * 24 * 9) },
    ],
    accessLog: [{ id: uid("al"), provider: "Dr. Priya Naidoo", organization: "Riverside General Hospital", action: "Viewed shared summary", createdAt: ago(60 * 24 * 3) }],
    lastInteraction: ago(60 * 24 * 3),
  };
  const others: Patient[] = [
    ["pt_bongani", "CC-3307-1984", "Bongani Dlamini", "1984-07-02", "0731110022"],
    ["pt_annelie", "CC-5512-1971", "Annelie van der Merwe", "1971-11-23", "0614447788"],
    ["pt_thandi2", "CC-9026-1990", "Thandi Mokoena", "1990-12-03", "0829990011"],
  ].map(([id, cc, name, dob, mob]) => ({
    id, ccId: cc, fullName: name, dateOfBirth: dob, nationalId: "", mobile: mob, password: "Patient123!", pin: "0000",
    team: [{ orgId: "org_riverside", connectedAt: ago(60 * 24 * 60) }], summaries: [], settings: defaultSettings(), notifications: [], accessLog: [],
  }));
  db.patients.push(thandiwe, ...others);
  db.consents.push(
    { id: uid("cs"), patientId: "pt_thandiwe", orgId: "org_lakeside", provider: "Sister N. Dube", scope: ["Referral information"], reason: "Follow-up visit", status: "PENDING", createdAt: ago(18) },
    { id: uid("cs"), patientId: "pt_thandiwe", orgId: "org_riverside", provider: "Dr. Priya Naidoo", scope: ["Signed summaries"], status: "APPROVED", duration: "SEVEN_DAYS", expiresAt: new Date(Date.now() + 4 * 864e5).toISOString(), createdAt: ago(60 * 24 * 3), respondedAt: ago(60 * 24 * 3) },
  );
  db.credentials.push(
    { id: "cred_demo_identity", patientId: "pt_thandiwe", type: "Verified identity", status: "Verified", issuer: "Riverside General Hospital", issuedAt: ago(60 * 24 * 40) },
    { id: "cred_demo_vaccination", patientId: "pt_thandiwe", type: "Vaccination certificate", status: "Active", issuer: "Lakeside Community Clinic", issuedAt: ago(60 * 24 * 200) },
  );
  db.caregivers.push({ id: uid("cg"), patientId: "pt_thandiwe", name: "Sipho Mokoena", relationship: "Brother", phone: "0825550199", pin: "1234" });
  db.activity.push(
    { id: uid("ac"), orgId: "org_riverside", actorLabel: "Dr. Priya Naidoo", action: "Consent approved", subjectLabel: "Thandiwe Mokoena", status: "Approved", createdAt: ago(60 * 24 * 3) },
    { id: uid("ac"), orgId: "org_riverside", actorLabel: "Reception", action: "Patient checked in", subjectLabel: "Bongani Dlamini", status: "Complete", createdAt: ago(55) },
    { id: uid("ac"), orgId: "org_riverside", actorLabel: "Dr. Priya Naidoo", action: "Access requested", subjectLabel: "Annelie van der Merwe", status: "Pending", createdAt: ago(25) },
  );
})();

const org = (id: string) => db.orgs.find((o) => o.id === id)!;
const pat = (id: string) => { const p = db.patients.find((x) => x.id === id); if (!p) throw new ApiError(404, "Patient not found."); return p; };
const provider = (id: string) => db.providers.find((p) => p.id === id)!;
const providerView = (p: (typeof db.providers)[number]) => ({ id: p.id, fullName: p.fullName, role: p.role, organization: { id: p.orgId, name: org(p.orgId).name, status: org(p.orgId).status } });
const patientView = (p: Patient) => ({ id: p.id, ccId: p.ccId, fullName: p.fullName, passportCompletion: completion(p) });
function completion(p: Patient) {
  const fields = [p.fullName, p.dateOfBirth, p.mobile, p.nationalId, p.email, p.emergencyContactName, p.emergencyContactRelationship];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}
function log(orgId: string, actorLabel: string, action: string, subjectLabel: string, status = "Complete") {
  db.activity.unshift({ id: uid("ac"), orgId, actorLabel, action, subjectLabel, status, createdAt: now() });
}
function notifyPatient(p: Patient, title: string, category = "INFORMATIONAL") {
  p.notifications.unshift({ id: uid("nt"), title, category, read: false, createdAt: now() });
}
function expire() {
  for (const c of db.consents) if (c.status === "APPROVED" && c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()) c.status = "REVOKED";
}
const consentView = (c: Consent) => ({ ...c, organization: org(c.orgId).name });
function respond(patientId: string, id: string, action: "approve" | "decline" | "revoke", duration: Duration = "SEVEN_DAYS") {
  const c = db.consents.find((x) => x.id === id && x.patientId === patientId);
  if (!c) throw new ApiError(404, "That request no longer exists.");
  if (action === "approve") {
    c.status = "APPROVED"; c.duration = duration; c.respondedAt = now();
    c.expiresAt = duration === "SEVEN_DAYS" ? new Date(Date.now() + 7 * 864e5).toISOString() : duration === "ONCE" ? new Date(Date.now() + 864e5).toISOString() : undefined;
  } else if (action === "decline") { c.status = "DECLINED"; c.respondedAt = now(); }
  else { c.status = "REVOKED"; c.respondedAt = now(); }
  log(c.orgId, pat(patientId).fullName, `Consent ${c.status.toLowerCase()}`, pat(patientId).fullName, c.status === "APPROVED" ? "Approved" : c.status.charAt(0) + c.status.slice(1).toLowerCase());
  return consentView(c);
}

function findPatientByLogin(identifier: string) {
  const id = identifier.trim().toLowerCase();
  return db.patients.find((p) => (p.email && p.email.toLowerCase() === id) || (digits(id).length >= 9 && phone(p.mobile) === phone(id)));
}

/* ------------------------------------------------------------------ auth */

export const authApi = {
  async patientRegister(payload: { fullName: string; dateOfBirth: string; nationalId: string; mobile: string; email?: string; password: string; emergencyContactName?: string; emergencyContactRelationship?: string; allergies?: string; bloodType?: string }) {
    if (db.patients.some((p) => phone(p.mobile) === phone(payload.mobile))) return fail(409, "That mobile number already has a demo account. Try signing in instead.");
    const p: Patient = {
      id: uid("pt"), ccId: ccId(), fullName: payload.fullName.trim(), dateOfBirth: payload.dateOfBirth, nationalId: digits(payload.nationalId), mobile: phone(payload.mobile), email: payload.email,
      password: payload.password, pin: "0000", emergencyContactName: payload.emergencyContactName, emergencyContactRelationship: payload.emergencyContactRelationship,
      allergies: payload.allergies, bloodType: payload.bloodType, team: [], summaries: [], settings: defaultSettings(), notifications: [], accessLog: [],
    };
    db.patients.push(p);
    notifyPatient(p, "Welcome to CLANCLAST. Your demo ID is ready.");
    return wait({ token: open("patient", p.id), patient: patientView(p) }, 500);
  },
  async patientLogin(identifier: string, password: string) {
    const p = findPatientByLogin(identifier);
    if (!p || p.password !== password) return fail(401, "Those details don't match a demo account.");
    return wait({ token: open("patient", p.id), patient: patientView(p) });
  },
  async me(_session: "provider") {
    return wait({ provider: providerView(provider(who("provider"))) });
  },
  async providerLogin(email: string, password: string) {
    const p = db.providers.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!p || p.password !== password) return fail(401, "Those details don't match a demo account.");
    return wait({ token: open("provider", p.id), provider: providerView(p) });
  },
  async caregiverLogin(phoneNumber: string, pin: string) {
    const c = db.caregivers.find((x) => x.phone && phone(x.phone) === phone(phoneNumber) && x.pin === pin);
    if (!c) return fail(401, "Incorrect phone number or PIN.");
    const p = pat(c.patientId);
    return wait({ token: open("caregiver", c.id), caregiver: { id: c.id, name: c.name, relationship: c.relationship, patient: { fullName: p.fullName, ccId: p.ccId } } });
  },
};

/* ------------------------------------------------------------------ caregiver */

const caregiverPatient = () => { const c = db.caregivers.find((x) => x.id === who("caregiver")); if (!c) throw new ApiError(401, "Please sign in again."); return pat(c.patientId); };

export const caregiverApi = {
  async patient() {
    const p = caregiverPatient();
    return wait({ fullName: p.fullName, ccId: p.ccId, bloodType: p.bloodType, allergies: p.allergies, emergencyContactName: p.emergencyContactName, emergencyContactRelationship: p.emergencyContactRelationship });
  },
  async consent() { expire(); const p = caregiverPatient(); return wait(db.consents.filter((c) => c.patientId === p.id).map(consentView)); },
  async approveConsent(id: string, duration: Duration) { return wait(respond(caregiverPatient().id, id, "approve", duration)); },
  async declineConsent(id: string) { return wait(respond(caregiverPatient().id, id, "decline")); },
};

/* ------------------------------------------------------------------ patient */

const me = () => pat(who("patient"));

export const patientApi = {
  async passport() {
    expire();
    const p = me();
    return wait({
      patient: { fullName: p.fullName, ccId: p.ccId, passportCompletion: completion(p), identityVerified: db.credentials.some((c) => c.patientId === p.id && c.type === "Verified identity" && c.status !== "Revoked") },
      emergencyInformation: { bloodType: p.bloodType, allergies: p.allergies, emergencyContactName: p.emergencyContactName, emergencyContactRelationship: p.emergencyContactRelationship },
      careTeam: p.team.map((t) => ({ label: org(t.orgId).name, role: org(t.orgId).type.charAt(0) + org(t.orgId).type.slice(1).toLowerCase() })),
      credentials: db.credentials.filter((c) => c.patientId === p.id),
      activePermissions: db.consents.filter((c) => c.patientId === p.id && c.status === "APPROVED").length,
    });
  },
  /** Codes on this site are illustrative patterns, not scannable. */
  async fetchQrPng() { return wait(""); },
  async fetchCredentialQr(_credentialId: string) { return wait(""); },
  async downloadHealthCard(id: string) {
    const p = me();
    const esc = (s: string) => s.replace(/[<>&"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[ch]!));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="856" height="540" viewBox="0 0 856 540"><rect width="856" height="540" rx="36" fill="#072b27"/><text x="56" y="96" fill="#8dd4ca" font-family="system-ui,sans-serif" font-size="26" font-weight="700" letter-spacing="4">CLANCLAST</text><text x="56" y="300" fill="#fff" font-family="system-ui,sans-serif" font-size="44" font-weight="700">${esc(p.fullName)}</text><text x="56" y="352" fill="#b0e4dc" font-family="ui-monospace,monospace" font-size="30">${esc(id)}</text><text x="56" y="480" fill="#8dd4ca" font-family="system-ui,sans-serif" font-size="20">DEMONSTRATION CARD · NOT A VALID IDENTITY DOCUMENT</text></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url; a.download = `clanclast-demo-card-${id}.svg`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    await wait(null, 300);
  },
  async summaries() { return wait(me().summaries.map((s) => ({ ...s, verified: true }))); },
  async team() {
    const p = me();
    return wait(p.team.map((t) => ({ id: t.orgId, label: org(t.orgId).name, role: org(t.orgId).type.charAt(0) + org(t.orgId).type.slice(1).toLowerCase(), status: "Connected", connectedAt: t.connectedAt })));
  },
  async consent() { expire(); const p = me(); return wait(db.consents.filter((c) => c.patientId === p.id).map(consentView)); },
  async approveConsent(id: string, duration: Duration) { return wait(respond(me().id, id, "approve", duration)); },
  async declineConsent(id: string) { return wait(respond(me().id, id, "decline")); },
  async revokeConsent(id: string) { return wait(respond(me().id, id, "revoke")); },
  async notifications() { return wait(me().notifications); },
  async settings() {
    const p = me();
    return wait({ email: p.email, allergies: p.allergies, bloodType: p.bloodType, emergencyContactName: p.emergencyContactName, emergencyContactRelationship: p.emergencyContactRelationship, passportCompletion: completion(p), ...p.settings });
  },
  async updateProfile(payload: Record<string, unknown>) {
    const p = me();
    for (const k of ["email", "allergies", "bloodType", "emergencyContactName", "emergencyContactRelationship"] as const) if (typeof payload[k] === "string") p[k] = payload[k] as string;
    for (const k of Object.keys(p.settings) as (keyof Patient["settings"])[]) if (k in payload) (p.settings as Record<string, unknown>)[k] = payload[k];
    return patientApi.settings();
  },
  async organizations() { return wait(db.orgs.map((o) => ({ id: o.id, name: o.name, status: o.status }))); },
  async connectOrganization(organizationId: string) {
    const p = me();
    if (!p.team.some((t) => t.orgId === organizationId)) p.team.push({ orgId: organizationId, connectedAt: now() });
    return wait({ ok: true });
  },
  async caregivers() { const p = me(); return wait(db.caregivers.filter((c) => c.patientId === p.id).map(({ pin, ...c }) => ({ ...c, canSignIn: !!(c.phone && pin) }))); },
  async addCaregiver(payload: { name: string; relationship: string; phone?: string; pin?: string }) {
    const c = { id: uid("cg"), patientId: me().id, ...payload, phone: payload.phone ? phone(payload.phone) : undefined };
    db.caregivers.push(c);
    return wait({ id: c.id, name: c.name, relationship: c.relationship, phone: c.phone, canSignIn: !!(c.phone && c.pin) });
  },
  async removeCaregiver(id: string) { const pid = me().id; db.caregivers = db.caregivers.filter((c) => !(c.id === id && c.patientId === pid)); return wait({ ok: true }); },
  async accessLog() { return wait(me().accessLog); },
  async acknowledgeAccess(id: string) { const l = me().accessLog.find((x) => x.id === id); if (l) l.acknowledgedByPatient = true; return wait({ ok: true }); },
};

/* ------------------------------------------------------------------ USSD (its own session, like a second phone) */

export const ussdApi = {
  async login(mobile: string, pin: string) {
    const p = findPatientByLogin(mobile);
    if (!p || (p.pin !== pin && p.password !== pin)) return fail(401, "Login failed. Check your mobile number and PIN.");
    return wait({ token: open("patient", p.id), patient: patientView(p) });
  },
  async consent(token: string) { expire(); const id = who("patient", token); return wait(db.consents.filter((c) => c.patientId === id).map(consentView)); },
  async emergency(token: string) { const p = pat(who("patient", token)); return wait({ bloodType: p.bloodType, allergies: p.allergies, emergencyContactName: p.emergencyContactName }); },
  async respond(token: string, id: string, action: "approve" | "decline") { return wait(respond(who("patient", token), id, action, "SEVEN_DAYS")); },
};

/* ------------------------------------------------------------------ provider */

const myProvider = () => provider(who("provider"));

/**
 * Illustration only: a few plain rules so the check-in screen has something to show.
 * This is NOT how CLANCLAST matches identities.
 */
function demoMatch(q: { fullName: string; dateOfBirth?: string; mobile?: string; nationalId?: string }, p: Patient) {
  const qn = norm(q.fullName).split(" "), pn = norm(p.fullName).split(" ");
  const sameName = qn.join(" ") === pn.join(" ");
  const sameSurname = qn[qn.length - 1] === pn[pn.length - 1];
  const sameFirst = !!qn[0] && (pn[0]?.startsWith(qn[0]) || qn[0].startsWith(pn[0] ?? "~"));
  const dob = !!q.dateOfBirth && q.dateOfBirth === p.dateOfBirth;
  const mob = !!q.mobile && phone(q.mobile) === phone(p.mobile);
  const nid = !!q.nationalId && !!p.nationalId && digits(q.nationalId) === p.nationalId;
  const why: string[] = [];
  if (sameName) why.push("Name agrees"); else if (sameSurname && sameFirst) why.push("Name is similar");
  if (dob) why.push("Date of birth agrees");
  if (mob) why.push("Mobile number agrees");
  if (nid) why.push("ID number agrees");
  const others = [dob, mob, nid].filter(Boolean).length;
  if (sameName && others >= 1) return { tier: "auto_link" as const, why };
  if ((sameName || (sameSurname && sameFirst)) || others >= 2) return { tier: "escalate" as const, why: why.length ? why : ["Some details agree"] };
  return null;
}

export const providerApi = {
  async dashboard() {
    const pr = myProvider();
    const pending = db.consents.filter((c) => c.orgId === pr.orgId && c.status === "PENDING").length;
    return wait({
      cards: [
        { label: "Patients connected", value: String(db.patients.filter((p) => p.team.some((t) => t.orgId === pr.orgId)).length) },
        { label: "Checked in today", value: String(db.activity.filter((a) => a.orgId === pr.orgId && a.action === "Patient checked in").length) },
        { label: "Consent requests", value: String(pending) },
        { label: "Verification alerts", value: "0" },
      ],
      recentActivity: db.activity.filter((a) => a.orgId === pr.orgId).slice(0, 5),
    });
  },
  async patients(search = "") {
    const q = norm(search), d = digits(search);
    return wait(db.patients
      .filter((p) => !q && !d || (q && norm(p.fullName).includes(q)) || (d.length >= 4 && phone(p.mobile).includes(d)) || p.ccId.toLowerCase().includes(search.trim().toLowerCase()))
      .map((p) => ({ id: p.id, fullName: p.fullName, ccId: p.ccId, identityVerified: db.credentials.some((c) => c.patientId === p.id && c.type === "Verified identity") })));
  },
  async patient(id: string) {
    expire();
    const pr = myProvider(), p = pat(id);
    const granted = db.consents.some((c) => c.patientId === id && c.orgId === pr.orgId && c.status === "APPROVED");
    return wait({
      id: p.id, fullName: p.fullName, ccId: p.ccId, identityVerified: db.credentials.some((c) => c.patientId === p.id && c.type === "Verified identity"),
      emergencyContactName: p.emergencyContactName, lastInteraction: p.lastInteraction, accessGranted: granted, sharedSummaries: granted ? p.summaries.length : 0,
      credentials: db.credentials.filter((c) => c.patientId === id),
    });
  },
  async registerPatient(payload: { fullName: string; dateOfBirth: string; nationalId: string; mobile: string; emergencyContactName?: string; emergencyContactRelationship?: string }) {
    const pr = myProvider();
    if (payload.nationalId && db.patients.some((p) => p.nationalId && p.nationalId === digits(payload.nationalId))) return fail(409, "Someone with this ID number already has a CLANCLAST ID. Use Check-in to find them.");
    const p: Patient = {
      id: uid("pt"), ccId: ccId(), fullName: payload.fullName.trim(), dateOfBirth: payload.dateOfBirth, nationalId: digits(payload.nationalId), mobile: phone(payload.mobile), password: uid("pw"), pin: "0000",
      emergencyContactName: payload.emergencyContactName, emergencyContactRelationship: payload.emergencyContactRelationship,
      team: [{ orgId: pr.orgId, connectedAt: now() }], summaries: [], settings: defaultSettings(), notifications: [], accessLog: [], lastInteraction: now(),
    };
    db.patients.push(p);
    log(pr.orgId, pr.fullName, "Patient registered", p.fullName);
    return wait({ id: p.id, ccId: p.ccId, fullName: p.fullName }, 450);
  },
  async verify(payload: { ccId?: string }) {
    const p = db.patients.find((x) => x.ccId.toLowerCase() === (payload.ccId || "").trim().toLowerCase());
    if (!p) return fail(404, "No CLANCLAST ID matches that reference.");
    const pr = myProvider();
    log(pr.orgId, pr.fullName, "Identity verified", p.fullName);
    return wait({ patient: { fullName: p.fullName, ccId: p.ccId }, method: "CLANCLAST ID", verifiedAt: now(), trustLevel: "Verified" });
  },
  async checkinLookup(payload: { fullName: string; dateOfBirth?: string; mobile?: string; nationalId?: string }) {
    const matches = db.patients.flatMap((p) => {
      const m = demoMatch(payload, p);
      return m ? [{ patientId: p.id, ccId: p.ccId, fullName: p.fullName, tier: m.tier, explanation: m.why }] : [];
    }).sort((a, b) => (a.tier === b.tier ? 0 : a.tier === "auto_link" ? -1 : 1));
    return wait({ query: payload, matches }, 400);
  },
  async confirmCheckin(patientId: string) {
    const pr = myProvider(), p = pat(patientId);
    p.lastInteraction = now();
    log(pr.orgId, "Reception", "Patient checked in", p.fullName);
    return wait({ id: p.id, ccId: p.ccId, fullName: p.fullName });
  },
  async requestConsent(payload: { patientId: string; scope: string[]; reason?: string }) {
    const pr = myProvider(), p = pat(payload.patientId);
    const c: Consent = { id: uid("cs"), patientId: p.id, orgId: pr.orgId, provider: pr.fullName, scope: payload.scope, reason: payload.reason, status: "PENDING", createdAt: now() };
    db.consents.push(c);
    notifyPatient(p, `${org(pr.orgId).name} is asking for access`, "ACTION_REQUIRED");
    log(pr.orgId, pr.fullName, "Access requested", p.fullName, "Pending");
    return wait({ id: c.id, status: c.status });
  },
  async consentRequests() {
    expire();
    const pr = myProvider();
    return wait(db.consents.filter((c) => c.orgId === pr.orgId).reverse().map((c) => ({ id: c.id, patient: pat(c.patientId).fullName, scope: c.scope, status: c.status, duration: c.duration })));
  },
  async resendConsentRequest(id: string) {
    const c = db.consents.find((x) => x.id === id);
    if (c) notifyPatient(pat(c.patientId), `${org(c.orgId).name} sent a reminder about their request`, "ACTION_REQUIRED");
    return wait({ ok: true });
  },
  async createReferral(payload: { patientId: string; toOrganizationId: string; reason: string; urgency?: string }) {
    const r = await providerApi.requestConsent({ patientId: payload.patientId, scope: ["Referral information"], reason: `Referral to ${org(payload.toOrganizationId).name}: ${payload.reason}` });
    return { id: uid("rf"), status: "AWAITING_CONSENT", consentRequestId: r.id };
  },
  async connections() {
    const pr = myProvider();
    return wait({
      organizations: db.orgs.map((o) => ({ id: o.id, name: o.name, type: o.type, status: o.status, isOwnOrganization: o.id === pr.orgId })),
      outgoing: db.connections.filter((c) => c.fromOrgId === pr.orgId).map((c) => ({ id: c.id, organization: org(c.toOrgId).name, status: c.status })),
      incoming: db.connections.filter((c) => c.toOrgId === pr.orgId).map((c) => ({ id: c.id, organization: org(c.fromOrgId).name, requestedBy: c.requestedBy, message: c.message, status: c.status })),
    });
  },
  async connectionDetail(id: string) { const o = org(id); return wait({ ...o, syncEvents: [...o.syncEvents] }); },
  async simulateSync(id: string) {
    const o = org(id);
    const ok = o.status !== "ATTENTION";
    o.syncEvents.unshift({ id: uid("ev"), message: ok ? "Connection check passed" : "Connection check timed out", status: ok ? "success" : "warning", createdAt: now() });
    o.lastSyncedAt = now();
    return wait({ ok }, 600);
  },
  async inviteConnection(payload: { toOrganizationId: string; message?: string }) {
    const pr = myProvider();
    if (db.connections.some((c) => c.fromOrgId === pr.orgId && c.toOrgId === payload.toOrganizationId && c.status === "PENDING")) return fail(409, "You've already sent this organisation an invite.");
    const c = { id: uid("cn"), fromOrgId: pr.orgId, toOrgId: payload.toOrganizationId, requestedBy: pr.fullName, message: payload.message, status: "PENDING" as const };
    db.connections.push(c);
    return wait({ id: c.id, status: c.status });
  },
  async acceptConnection(id: string) { const c = db.connections.find((x) => x.id === id); if (c) c.status = "ACCEPTED"; return wait({ ok: true }); },
  async declineConnection(id: string) { const c = db.connections.find((x) => x.id === id); if (c) c.status = "DECLINED"; return wait({ ok: true }); },
  async activity() { const pr = myProvider(); return wait(db.activity.filter((a) => a.orgId === pr.orgId)); },
  async notifications() {
    const pr = myProvider();
    return wait(db.activity.filter((a) => a.orgId === pr.orgId).slice(0, 6).map((a) => ({ id: a.id, title: a.action, body: a.subjectLabel, createdAt: a.createdAt })));
  },
  async updateProfile(payload: { fullName?: string; role?: string }) {
    const pr = myProvider();
    if (payload.fullName) pr.fullName = payload.fullName;
    if (payload.role) pr.role = payload.role;
    return wait(providerView(pr));
  },
  async issueCredential(patientId: string, payload: { type: string; status?: string }) {
    const pr = myProvider(), p = pat(patientId);
    const c: Credential = { id: uid("cred"), patientId, type: payload.type, status: payload.status || "Verified", issuer: org(pr.orgId).name, issuedAt: now() };
    db.credentials.push(c);
    notifyPatient(p, `${c.issuer} issued you a credential: ${c.type}`);
    log(pr.orgId, pr.fullName, "Credential issued", p.fullName);
    return wait({ id: c.id, type: c.type, status: c.status, issuedAt: c.issuedAt });
  },
  async revokeCredential(id: string) {
    const c = db.credentials.find((x) => x.id === id);
    if (c) { c.status = "Revoked"; notifyPatient(pat(c.patientId), `${c.issuer} revoked a credential: ${c.type}`, "IMPORTANT"); }
    return wait({ ok: true });
  },
  async emergencyAccess(patientId: string, reason: string) {
    const pr = myProvider(), p = pat(patientId);
    p.accessLog.unshift({ id: uid("al"), provider: pr.fullName, organization: org(pr.orgId).name, action: "Emergency access", createdAt: now(), isEmergency: true, reason, acknowledgedByPatient: false });
    notifyPatient(p, `Emergency access was used by ${org(pr.orgId).name}`, "IMPORTANT");
    log(pr.orgId, pr.fullName, "Emergency access", p.fullName, "Logged");
    return wait({ bloodType: p.bloodType, allergies: p.allergies, emergencyContactName: p.emergencyContactName, emergencyContactRelationship: p.emergencyContactRelationship });
  },
};

/* ------------------------------------------------------------------ Connect (public) */

export const connectApi = {
  async stats() {
    const c = db.orgs.filter((o) => o.status === "CONNECTED").length, p = db.orgs.filter((o) => o.status === "PENDING").length, a = db.orgs.filter((o) => o.status === "ATTENTION").length;
    return wait({ connected: c, pending: p, needsAttention: a, total: db.orgs.length });
  },
  async onboard(payload: { organizationName: string; organizationType: string; contactName: string; contactEmail: string; adminFullName: string; adminEmail: string; adminPassword: string }) {
    if (db.providers.some((p) => p.email.toLowerCase() === payload.adminEmail.trim().toLowerCase())) return fail(409, "That administrator email is already in use in this demo.");
    const o: Org = { id: uid("org"), name: payload.organizationName.trim(), type: payload.organizationType, status: "PENDING", syncEvents: [] };
    db.orgs.push(o);
    const pr = { id: uid("pr"), email: payload.adminEmail.trim(), password: payload.adminPassword, fullName: payload.adminFullName.trim(), role: "Administrator", orgId: o.id };
    db.providers.push(pr);
    return wait({ token: open("provider", pr.id), provider: providerView(pr) }, 500);
  },
};

/* ------------------------------------------------------------------ Verify (public) */

export const verifyApi = {
  async lookup(id: string) {
    const p = db.patients.find((x) => x.ccId.toLowerCase() === id.trim().toLowerCase());
    if (!p) return fail(404, "No CLANCLAST ID matches that reference.");
    const verified = db.credentials.some((c) => c.patientId === p.id && c.type === "Verified identity" && c.status !== "Revoked");
    return wait({ verified, whatWasVerified: "CLANCLAST ID is genuine", issuedBy: verified ? db.credentials.find((c) => c.patientId === p.id && c.type === "Verified identity")!.issuer : "Not yet verified by an institution", method: "Reference check", consentStatus: "No personal information is shown without the patient's consent" });
  },
  async credentialLookup(id: string) {
    const c = db.credentials.find((x) => x.id === id.trim());
    if (!c) return fail(404, "No credential matches that reference.");
    const p = pat(c.patientId);
    const revoked = c.status === "Revoked";
    return wait({ valid: !revoked, revoked, credentialType: c.type, holderName: p.fullName.split(" ").map((n, i, a) => (i === a.length - 1 ? n : `${n[0]}.`)).join(" "), issuedBy: c.issuer, issuedAt: c.issuedAt, status: c.status });
  },
};
