/**
 * Website demo: the provider workspace's API, answered by the in-browser demo backend
 * (src/demo/db.ts) instead of a server. Same functions and response shapes as the
 * production client, so these are the real screens. Nothing leaves this browser.
 * The identity-resolution engine is not part of the demo.
 */
import {
  DemoError, read, write, pause, uid, now, mobileKey, digits, newHumanetId, org, patientById, providerById, logActivity, addAccess, notify, ensureCareTeam,
  expireConsents, activeConsent, activeKey, rotateKey, signVcJwt, fingerprint, issuerIdFor, demoMatches, SUMMARY_FORMAT, SYNTHETIC_ISSUER, type DB, type Patient, type Org,
} from "../../../demo/db";

export const BASE_URL = "/demo/api";

const KEY = "cc_provider_token";
export function getToken(): string | null { try { return localStorage.getItem(KEY); } catch { return null; } }
export function setToken(token: string) { try { localStorage.setItem(KEY, token); } catch { /* ignore */ } }
export function clearToken() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) { super(message); this.status = status; this.details = details; }
}

async function call<T>(fn: () => T | Promise<T>, ms?: number): Promise<T> {
  try { return await pause(await fn(), ms); }
  catch (e) {
    if (e instanceof DemoError) {
      if (e.status === 401 && getToken()) { clearToken(); window.dispatchEvent(new Event("cc:session-expired")); }
      await pause(null, 120);
      throw new ApiError(e.status, e.message, e.details);
    }
    throw e;
  }
}

function meId() {
  const t = getToken();
  const id = t?.startsWith("demo:provider:") ? t.slice(14) : null;
  if (!id || !read().providers.some((p) => p.id === id)) throw new DemoError(401, "Your demo session has ended. Please sign in again.");
  return id;
}
const me = (db: DB) => providerById(db, meId());
const DOCUMENT_LABEL = { SA_ID: "South African ID", PASSPORT: "passport", OTHER: "other official document", NONE: "no document" } as const;
const relationship = (db: DB, patientId: string, orgId: string) => db.careTeam.some((c) => c.patientId === patientId && c.orgId === orgId) || db.consents.some((c) => c.patientId === patientId && c.orgId === orgId && c.status === "APPROVED");
const NO_RELATIONSHIP = "This patient isn't in your institution's care yet. Check them in first.";
const ref = (p: Patient) => ({ id: p.id, humanetId: p.humanetId, fullName: p.fullName, identityVerified: p.identityVerified });
const sessionView = (db: DB, id: string): ProviderSession => {
  const p = providerById(db, id), o = org(db, p.orgId);
  return { token: `demo:provider:${p.id}`, provider: { id: p.id, fullName: p.fullName, role: p.role, organization: { id: o.id, name: o.name, status: o.status, type: o.type } } };
};
function recordPrevented(db: DB, orgId: string, actor: string, subject: string) {
  logActivity(db, { orgId, actorType: "PROVIDER", actorLabel: actor, action: "Duplicate registration prevented", subjectLabel: subject, status: "Existing ID used" });
}

// ---------- Types ----------

export type Organization = { id: string; name: string; status: string; type?: string };
export type IdentityDocument = "SA_ID" | "PASSPORT" | "OTHER";
export type PatientRef = { id: string; humanetId: string; fullName: string; identityVerified: boolean };
export type Match = { patientId: string; humanetId: string; fullName: string; identityVerified: boolean; tier: "auto_link" | "escalate" | "distinct"; overallScore: number; explanation: string[] };
export type ProviderSession = { token: string; provider: { id: string; fullName: string; role: string; organization: Organization } };
export type Activity = { id: string; actorLabel: string; action: string; subjectLabel: string; status: string; createdAt: string };
export type Dashboard = {
  organization: { name: string; status: string };
  provider: { fullName: string; role: string };
  cards: { key: "checkedIn" | "inCare" | "identityPending" | "consentPending" | string; label: string; value: number }[];
  recentActivity: Activity[];
};

// ---------- Auth ----------

export const authApi = {
  login: (email: string, password: string) => call(() => {
    const db = read();
    const p = db.providers.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!p || p.password !== password) throw new DemoError(401, "That email and password don't match a demo account.");
    return sessionView(db, p.id);
  }, 400),
  register: (payload: { organizationName: string; organizationType: "HOSPITAL" | "LABORATORY" | "PHARMACY" | "CLINIC"; fullName: string; email: string; password: string }) => call(() => write((db) => {
    if (db.providers.some((p) => p.email.toLowerCase() === payload.email.trim().toLowerCase())) throw new DemoError(409, "That email already has an account.");
    // In the demo a new organisation is approved straight away; in production CLANCLAST verifies it first.
    const o: Org = { id: uid("org"), name: payload.organizationName.trim(), type: payload.organizationType, status: "CONNECTED", fhirGateway: false, gatewayUrl: null, lastSyncedAt: null };
    db.orgs.push(o);
    const p = { id: uid("pr"), email: payload.email.trim(), password: payload.password, fullName: payload.fullName.trim(), role: "Administrator", orgId: o.id };
    db.providers.push(p);
    logActivity(db, { orgId: o.id, actorType: "PROVIDER", actorLabel: p.fullName, action: "Organisation created", subjectLabel: o.name, status: "Approved for the demo" });
    return sessionView(db, p.id);
  }), 600),
  me: () => call(() => { const db = read(); return { provider: sessionView(db, meId()).provider }; }),
};

// ---------- Provider ----------

export const providerApi = {
  dashboard: () => call((): Dashboard => write((db) => {
    expireConsents(db);
    const p = me(db), o = org(db, p.orgId);
    const inCare = db.patients.filter((x) => db.careTeam.some((c) => c.patientId === x.id && c.orgId === o.id));
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const acts = db.activity.filter((a) => a.orgId === o.id).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return {
      organization: { name: o.name, status: o.status },
      provider: { fullName: p.fullName, role: p.role },
      cards: [
        { key: "checkedIn", label: "Checked in today", value: acts.filter((a) => Date.parse(a.createdAt) >= start.getTime() && ["Check-in match confirmed", "Patient checked in", "Patient registered"].includes(a.action)).length },
        { key: "inCare", label: "Patients in your care", value: inCare.length },
        { key: "identityPending", label: "Identity checks pending", value: inCare.filter((x) => !x.identityVerified).length },
        { key: "consentPending", label: "Waiting on patient consent", value: db.consents.filter((c) => c.orgId === o.id && c.status === "PENDING").length },
      ],
      recentActivity: acts.slice(0, 6),
    };
  })),
  patients: (search?: string) => call(() => {
    const db = read(); const p = me(db);
    const q = (search ?? "").trim().toLowerCase(), d = digits(q);
    return db.patients
      .filter((x) => db.careTeam.some((c) => c.patientId === x.id && c.orgId === p.orgId))
      .filter((x) => !q || x.fullName.toLowerCase().includes(q) || x.humanetId.toLowerCase().includes(q) || (d.length >= 3 && x.mobile.includes(d)))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 25).map(ref);
  }),
  patient: (id: string) => call((): PatientDetail => write((db) => {
    expireConsents(db);
    const pr = me(db), x = patientById(db, id), o = pr.orgId;
    if (!relationship(db, x.id, o)) throw new DemoError(403, NO_RELATIONSHIP);
    const recent = db.access.find((a) => a.patientId === x.id && a.providerId === pr.id && a.action === "Viewed your CLANCLAST profile" && Date.now() - Date.parse(a.createdAt) < 3_600_000);
    if (!recent) addAccess(db, { patientId: x.id, orgId: o, providerId: pr.id, action: "Viewed your CLANCLAST profile" });
    const active = activeConsent(db, x.id, o);
    const issuerName = (iss: string) => iss === SYNTHETIC_ISSUER.id ? SYNTHETIC_ISSUER.name : (db.orgs.find((g) => issuerIdFor(g.id) === iss)?.name ?? "Another institution");
    return {
      id: x.id, humanetId: x.humanetId, fullName: x.fullName, dateOfBirth: x.dateOfBirth, identityVerified: x.identityVerified, registeredBy: x.registeredBy, createdAt: x.createdAt,
      emergencyContact: x.emergencyContactName ? { name: x.emergencyContactName, relationship: x.emergencyContactRelationship } : null,
      consent: {
        active: active ? { id: active.id, scope: active.scope, duration: active.duration, approvedAt: active.respondedAt, expiresAt: active.expiresAt } : null,
        history: db.consents.filter((c) => c.patientId === x.id && c.orgId === o).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 20)
          .map((c) => ({ id: c.id, scope: c.scope, status: c.status, duration: c.duration, createdAt: c.createdAt, respondedAt: c.respondedAt })),
      },
      summaries: db.issuances.filter((s) => s.patientId === x.id).sort((a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt))
        .map((s) => ({ id: s.id, tier: s.tier, version: s.version, issuer: issuerName(s.issuerId), ownIssuer: s.issuerId === issuerIdFor(o), issuedAt: s.issuedAt, expiresAt: s.expiresAt, revokedAt: s.revokedAt })),
      identityLinks: [],
      credentials: db.credentials.filter((c) => c.patientId === x.id).map((c) => ({ id: c.id, type: c.type, status: c.status, issuer: org(db, c.issuerOrgId).name, issuedAt: c.issuedAt, isOwnOrgCredential: c.issuerOrgId === o })),
      access: db.access.filter((a) => a.patientId === x.id && a.orgId === o).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 15)
        .map((a) => ({ id: a.id, action: a.action, by: providerById(db, a.providerId).fullName, isEmergency: a.isEmergency, createdAt: a.createdAt })),
    };
  })),
  registerPatient: (payload: { fullName: string; dateOfBirth: string; nationalId: string; mobile: string; emergencyContactName?: string; emergencyContactRelationship?: string; identityDocument: IdentityDocument | "NONE" }) => call((): PatientRef => write((db) => {
    const pr = me(db);
    const nationalId = payload.nationalId.replace(/[\s-]/g, ""), mobile = mobileKey(payload.mobile);
    const existing = db.patients.find((x) => x.mobile === mobile || (nationalId && x.nationalId === nationalId));
    if (existing) {
      recordPrevented(db, pr.orgId, pr.fullName, existing.fullName);
      const e = new DemoError(409, `A CLANCLAST ID already exists with this ${existing.nationalId === nationalId ? "ID number" : "mobile number"}. Check the person in instead of registering them again.`);
      e.details = { existing: { id: existing.id, humanetId: existing.humanetId, fullName: existing.fullName } };
      throw e;
    }
    const verified = payload.identityDocument !== "NONE";
    const x: Patient = {
      id: uid("pt"), humanetId: newHumanetId(db), fullName: payload.fullName.trim(), dateOfBirth: payload.dateOfBirth, nationalId, mobile, email: null, password: uid("pw"), pin: "0000",
      identityVerified: verified, registeredBy: "staff", createdAt: now(), emergencyContactName: payload.emergencyContactName || null, emergencyContactRelationship: payload.emergencyContactRelationship || null,
      language: "English", largeText: false, defaultConsentDuration: "SEVEN_DAYS", notifyActionRequired: true, notifyImportant: true, notifyInformational: true,
    };
    db.patients.push(x);
    logActivity(db, { orgId: pr.orgId, actorType: "PROVIDER", actorLabel: pr.fullName, action: "Patient registered", subjectLabel: x.fullName, status: verified ? `Identity checked against ${DOCUMENT_LABEL[payload.identityDocument]}` : "Identity check pending" });
    ensureCareTeam(db, x.id, pr.orgId, pr.id, "Registering provider");
    addAccess(db, { patientId: x.id, orgId: pr.orgId, providerId: pr.id, action: verified ? `Registered you and checked your ${DOCUMENT_LABEL[payload.identityDocument]}` : "Registered you" });
    return ref(x);
  }), 500),
  verify: (payload: { humanetId?: string; qrToken?: string }) => call(() => write((db) => {
    const pr = me(db);
    let id = payload.humanetId;
    if (payload.qrToken) {
      try {
        const t = JSON.parse(atob(payload.qrToken.replace(/^demo\./, ""))) as { h: string; e: number };
        if (t.e < Date.now()) throw new Error("expired");
        id = t.h;
      } catch { throw new DemoError(400, "This QR code has expired or is invalid. Ask the patient to refresh it."); }
    }
    if (!id) throw new DemoError(400, "Provide either humanetId or qrToken");
    const x = db.patients.find((p) => p.humanetId === id);
    if (!x) throw new DemoError(404, "No CLANCLAST ID matches that code");
    logActivity(db, { orgId: pr.orgId, actorType: "PROVIDER", actorLabel: pr.fullName, action: "Identity verified", subjectLabel: x.fullName, status: "Verified" });
    addAccess(db, { patientId: x.id, orgId: pr.orgId, providerId: pr.id, action: "Verified identity" });
    return { verified: true, trustLevel: "high", patient: ref(x), verifiedAt: now(), method: payload.qrToken ? "QR code scan" : "CLANCLAST ID typed in" };
  })),
  checkinLookup: (payload: { fullName: string; dateOfBirth?: string; mobile?: string; nationalId?: string }) => call(() => write((db) => {
    const pr = me(db);
    const matches = demoMatches(db, payload);
    logActivity(db, { orgId: pr.orgId, actorType: "PROVIDER", actorLabel: pr.fullName, action: "Check-in lookup", subjectLabel: payload.fullName, status: matches.length ? `${matches.length} possible match(es)` : "No match — likely new patient" });
    return { query: payload, matches: matches.map((m): Match => ({ patientId: m.patient.id, humanetId: m.patient.humanetId, fullName: m.patient.fullName, identityVerified: m.patient.identityVerified, tier: m.tier, overallScore: m.overallScore, explanation: m.explanation })) };
  }), 450),
  confirmCheckin: (patientId: string, preventedDuplicate = false) => call((): PatientRef => write((db) => {
    const pr = me(db), x = patientById(db, patientId);
    logActivity(db, { orgId: pr.orgId, actorType: "PROVIDER", actorLabel: pr.fullName, action: "Patient checked in", subjectLabel: x.fullName, status: x.identityVerified ? "Identity verified" : "Identity check pending" });
    addAccess(db, { patientId: x.id, orgId: pr.orgId, providerId: pr.id, action: "Checked you in" });
    notify(db, x.id, "INFORMATIONAL", `${org(db, pr.orgId).name} checked you in`);
    if (preventedDuplicate) recordPrevented(db, pr.orgId, pr.fullName, x.fullName);
    ensureCareTeam(db, x.id, pr.orgId, pr.id, "Confirmed at check-in");
    return ref(x);
  })),
  confirmIdentity: (patientId: string, document: IdentityDocument) => call(() => write((db) => {
    const pr = me(db), x = patientById(db, patientId);
    x.identityVerified = true;
    ensureCareTeam(db, x.id, pr.orgId, pr.id, "Confirmed identity at check-in");
    addAccess(db, { patientId: x.id, orgId: pr.orgId, providerId: pr.id, action: `Checked your ${DOCUMENT_LABEL[document]}` });
    logActivity(db, { orgId: pr.orgId, actorType: "PROVIDER", actorLabel: pr.fullName, action: "Identity confirmed", subjectLabel: x.fullName, status: `Checked against ${DOCUMENT_LABEL[document]}` });
    return { id: x.id, identityVerified: true as const };
  })),
  requestConsent: (payload: { patientId: string; scope: string[]; reason?: string }) => call(() => write((db) => {
    const pr = me(db), x = patientById(db, payload.patientId), o = org(db, pr.orgId);
    const c = { id: uid("cs"), patientId: x.id, orgId: o.id, providerId: pr.id, scope: payload.scope, reason: payload.reason || null, status: "PENDING" as const, duration: null, createdAt: now(), respondedAt: null, expiresAt: null, revokedAt: null };
    db.consents.push(c);
    notify(db, x.id, "ACTION_REQUIRED", `${o.name} is requesting access`, `${payload.scope.join(", ")}${payload.reason ? ` — ${payload.reason}` : ""}`);
    logActivity(db, { orgId: o.id, actorType: "PROVIDER", actorLabel: pr.fullName, action: "Access requested", subjectLabel: `${x.fullName} · ${payload.scope.join(", ")}`, status: "Patient consent required" });
    return { id: c.id, status: c.status };
  })),
  consentRequests: () => call(() => write((db) => {
    expireConsents(db);
    const pr = me(db);
    return db.consents.filter((c) => c.orgId === pr.orgId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((c) => ({ id: c.id, patient: patientById(db, c.patientId).fullName, scope: c.scope, status: c.status, duration: c.duration, createdAt: c.createdAt, respondedAt: c.respondedAt }));
  })),
  resendConsentRequest: (id: string) => call(() => write((db) => {
    const pr = me(db);
    const c = db.consents.find((x) => x.id === id && x.orgId === pr.orgId);
    if (!c) throw new DemoError(404, "Consent request not found");
    if (c.status !== "PENDING") throw new DemoError(409, "Only pending requests can be resent");
    notify(db, c.patientId, "ACTION_REQUIRED", `Reminder: ${org(db, pr.orgId).name} is requesting access`, c.scope.join(", "));
    logActivity(db, { orgId: pr.orgId, actorType: "PROVIDER", actorLabel: pr.fullName, action: "Request resent", subjectLabel: patientById(db, c.patientId).fullName, status: "Reminder sent" });
    return { ok: true };
  })),
  createReferral: (payload: { patientId: string; toOrganizationId: string; reason: string; urgency?: string; scope?: string[] }) => call(() => write((db) => {
    const pr = me(db), x = patientById(db, payload.patientId), to = org(db, payload.toOrganizationId);
    const scope = payload.scope ?? ["Laboratory results", "Consultation note"];
    const c = { id: uid("cs"), patientId: x.id, orgId: pr.orgId, providerId: pr.id, scope, reason: `Referral: ${payload.reason}`, status: "PENDING" as const, duration: null, createdAt: now(), respondedAt: null, expiresAt: null, revokedAt: null };
    db.consents.push(c);
    const r = { id: uid("rf"), patientId: x.id, fromProviderId: pr.id, toOrgId: to.id, reason: payload.reason, urgency: payload.urgency ?? "Routine", status: "AWAITING_CONSENT", consentId: c.id, createdAt: now() };
    db.referrals.push(r);
    notify(db, x.id, "ACTION_REQUIRED", `${pr.fullName} sent a referral to ${to.name}`, payload.reason);
    logActivity(db, { orgId: pr.orgId, actorType: "PROVIDER", actorLabel: pr.fullName, action: "Referral sent", subjectLabel: `${to.name} · ${x.fullName}`, status: "Consent pending" });
    return { id: r.id, status: r.status, consentRequestId: c.id };
  })),
  referrals: () => call(() => {
    const db = read(); const pr = me(db);
    return db.referrals.filter((r) => r.fromProviderId === pr.id).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((r) => ({ id: r.id, patient: patientById(db, r.patientId).fullName, toOrganization: org(db, r.toOrgId).name, reason: r.reason, urgency: r.urgency, status: r.status, createdAt: r.createdAt }));
  }),
  connections: () => call(() => directory(read())),
  connectionDetail: (id: string) => call(() => {
    const db = read(); const pr = me(db);
    const o = db.orgs.find((x) => x.id === id);
    if (!o) throw new DemoError(404, "Organisation not found");
    if (o.id !== pr.orgId && !db.connections.some((c) => c.status === "ACCEPTED" && ((c.fromOrgId === pr.orgId && c.toOrgId === o.id) || (c.toOrgId === pr.orgId && c.fromOrgId === o.id)))) throw new DemoError(403, "Your organization is not connected to this organization");
    return { id: o.id, name: o.name, type: o.type, status: o.status, fhirGateway: o.fhirGateway, gatewayUrl: o.gatewayUrl, lastSyncedAt: o.lastSyncedAt, syncEvents: db.syncEvents.filter((s) => s.orgId === o.id).slice(0, 10) };
  }),
  inviteConnection: (payload: { toOrganizationId: string; message?: string }) => call(() => write((db) => {
    const pr = me(db);
    if (payload.toOrganizationId === pr.orgId) throw new DemoError(400, "Cannot connect an organisation to itself");
    const to = org(db, payload.toOrganizationId);
    if (db.connections.some((c) => ((c.fromOrgId === pr.orgId && c.toOrgId === to.id) || (c.toOrgId === pr.orgId && c.fromOrgId === to.id)) && c.status !== "DECLINED")) throw new DemoError(409, "A connection with that organisation already exists or is pending");
    const c = { id: uid("cn"), fromOrgId: pr.orgId, toOrgId: to.id, requestedByProviderId: pr.id, message: payload.message ?? null, status: "PENDING" as const, createdAt: now() };
    db.connections.push(c);
    logActivity(db, { orgId: pr.orgId, actorType: "PROVIDER", actorLabel: pr.fullName, action: "Connection invite sent", subjectLabel: to.name, status: "Pending" });
    return { id: c.id, status: c.status };
  })),
  acceptConnection: (id: string) => call(() => respondConnection(id, "ACCEPTED")),
  declineConnection: (id: string) => call(() => respondConnection(id, "DECLINED")),
  activity: () => call(() => { const db = read(); const pr = me(db); return db.activity.filter((a) => a.orgId === pr.orgId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 200) as Activity[]; }),
  notifications: () => call(() => { const db = read(); const pr = me(db); return db.activity.filter((a) => a.orgId === pr.orgId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 15).map((l) => ({ id: l.id, title: l.action, body: l.subjectLabel, status: l.status, createdAt: l.createdAt })); }),
  updateProfile: (payload: { fullName?: string; role?: string }) => call(() => write((db) => {
    const pr = me(db);
    if (payload.fullName) pr.fullName = payload.fullName;
    if (payload.role) pr.role = payload.role;
    const o = org(db, pr.orgId);
    return { id: pr.id, fullName: pr.fullName, role: pr.role, email: pr.email, organization: { id: o.id, name: o.name, status: o.status, type: o.type, fhirGateway: o.fhirGateway } };
  })),
  emergencyAccess: (patientId: string, reason: string) => call((): EmergencyResult => write((db) => {
    if (reason.trim().length < 10) throw new DemoError(400, "Please describe the emergency reason (at least 10 characters)");
    const pr = me(db), x = patientById(db, patientId), o = org(db, pr.orgId);
    addAccess(db, { patientId: x.id, orgId: o.id, providerId: pr.id, action: "Emergency access", isEmergency: true, reason });
    notify(db, x.id, "ACTION_REQUIRED", `Emergency access was used on your account by ${pr.fullName}`, `${o.name} · Reason given: ${reason}`);
    logActivity(db, { orgId: o.id, actorType: "PROVIDER", actorLabel: pr.fullName, action: "Emergency access used", subjectLabel: x.fullName, status: "Break-glass — logged for review" });
    const issued = db.issuances.filter((s) => s.patientId === x.id && !s.revokedAt && Date.parse(s.expiresAt) > Date.now()).sort((a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt));
    const names = new Map<string, string>();
    for (const s of issued) names.set(s.issuerId, s.issuerId === SYNTHETIC_ISSUER.id ? SYNTHETIC_ISSUER.name : db.orgs.find((g) => issuerIdFor(g.id) === s.issuerId)?.name ?? "Another institution");
    return {
      fullName: x.fullName, humanetId: x.humanetId, dateOfBirth: x.dateOfBirth, identityVerified: x.identityVerified,
      emergencyContact: x.emergencyContactName ? { name: x.emergencyContactName, relationship: x.emergencyContactRelationship } : null,
      summaryIssuers: [...names].map(([iss, name]) => ({ name, latest: issued.find((s) => s.issuerId === iss)?.issuedAt ?? null })),
    };
  })),
};

function respondConnection(id: string, decision: "ACCEPTED" | "DECLINED") {
  return write((db) => {
    const pr = me(db);
    const c = db.connections.find((x) => x.id === id);
    if (!c) throw new DemoError(404, "Connection request not found");
    if (c.toOrgId !== pr.orgId) throw new DemoError(403, "Only the receiving organisation can respond to this request");
    if (c.status !== "PENDING") throw new DemoError(409, `Request is already ${c.status.toLowerCase()}`);
    c.status = decision;
    logActivity(db, { orgId: pr.orgId, actorType: "PROVIDER", actorLabel: pr.fullName, action: decision === "ACCEPTED" ? "Connection accepted" : "Connection declined", subjectLabel: org(db, c.fromOrgId).name, status: decision === "ACCEPTED" ? "Connected" : "Declined" });
    return { id: c.id, status: c.status };
  });
}

function directory(db: DB): Directory {
  const pr = me(db);
  return {
    organizations: db.orgs.slice().sort((a, b) => a.name.localeCompare(b.name)).map((o) => ({ id: o.id, name: o.name, type: o.type, status: o.status, isOwnOrganization: o.id === pr.orgId })),
    outgoing: db.connections.filter((c) => c.fromOrgId === pr.orgId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map((c) => ({ id: c.id, organization: org(db, c.toOrgId).name, status: c.status, message: c.message, createdAt: c.createdAt })),
    incoming: db.connections.filter((c) => c.toOrgId === pr.orgId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map((c) => ({ id: c.id, organization: org(db, c.fromOrgId).name, requestedBy: providerById(db, c.requestedByProviderId).fullName, status: c.status, message: c.message, createdAt: c.createdAt })),
  };
}

// ---------- Signed summaries ----------

export type SummaryContent = {
  bloodGroup?: string; allergies: string[]; chronicConditions: string[]; currentMedication: string[]; alerts: string[];
  recentDiagnoses?: string[]; procedures?: string[]; keyResults?: { name: string; value: string; unit: string; date?: string }[]; activeReferrals?: string[];
};
export type InstitutionKey = { kid: string; algorithm: string; fingerprint: string; createdAt: string; retiredAt: string | null; revokedAt: string | null; status: "ACTIVE" | "RETIRED" | "REVOKED" };
export type Issued = { id: string; tier: 1 | 2; version: number; keyId: string; issuedAt: string; expiresAt: string; revokedAt: string | null; revokedReason: string | null; patient: { id: string; fullName: string; humanetId: string } | null };
export type SummariesState = { issuer: { id: string; name: string; status: string }; keys: InstitutionKey[]; issued: Issued[] };
export type IssueResult = { id: string; jws: string; tier: 1 | 2; version: number; issuedAt: string; expiresAt: string; patient: { id: string; humanetId: string; fullName: string } };

const TTL_DAYS: Record<1 | 2, number> = { 1: 90, 2: 30 };

export const summariesApi = {
  state: () => call((): SummariesState => {
    const db = read(); const pr = me(db), o = org(db, pr.orgId), iss = issuerIdFor(o.id);
    return {
      issuer: { id: iss, name: o.name, status: o.status },
      keys: db.keys.filter((k) => k.orgId === o.id).map((k) => ({ kid: k.kid, algorithm: "Ed25519", fingerprint: fingerprint(k.x), createdAt: k.createdAt, retiredAt: k.retiredAt, revokedAt: k.revokedAt, status: k.revokedAt ? "REVOKED" : k.retiredAt ? "RETIRED" : "ACTIVE" })),
      issued: db.issuances.filter((s) => s.issuerId === iss).sort((a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt)).slice(0, 200).map((s) => {
        const x = db.patients.find((p) => p.id === s.patientId);
        return { id: s.id, tier: s.tier, version: s.version, keyId: s.keyId, issuedAt: s.issuedAt, expiresAt: s.expiresAt, revokedAt: s.revokedAt, revokedReason: s.revokedReason, patient: x ? { id: x.id, fullName: x.fullName, humanetId: x.humanetId } : null };
      }),
    };
  }),
  ensureKey: () => call(async () => { const k = await activeKey(me(read()).orgId); return { kid: k.kid, fingerprint: fingerprint(k.x), createdAt: k.createdAt }; }, 400),
  rotate: () => call(async () => {
    const pr = me(read());
    const k = await rotateKey(pr.orgId);
    write((db) => logActivity(db, { orgId: pr.orgId, actorType: "PROVIDER", actorLabel: pr.fullName, action: "Signing key rotated", subjectLabel: org(db, pr.orgId).name, status: `New key ${k.kid}` }));
    return { kid: k.kid, fingerprint: fingerprint(k.x), createdAt: k.createdAt };
  }, 400),
  issue: (payload: { patientId: string; tier: 1 | 2; content: SummaryContent }) => call(async (): Promise<IssueResult> => {
    const db0 = read();
    const pr = me(db0), x = patientById(db0, payload.patientId), o = org(db0, pr.orgId);
    if (!relationship(db0, x.id, o.id)) throw new DemoError(403, NO_RELATIONSHIP);
    if (!x.identityVerified) throw new DemoError(409, "Verify this patient’s identity against a document before issuing a summary they will carry.");
    const key = await activeKey(o.id);
    const iss = issuerIdFor(o.id), tier = payload.tier;
    const version = read().issuances.filter((s) => s.patientId === x.id && s.tier === tier && s.issuerId === iss).length + 1;
    const id = `urn:uuid:${crypto.randomUUID()}`;
    const t = new Date(), expiresAt = new Date(t.getTime() + TTL_DAYS[tier] * 86_400_000);
    const c = payload.content;
    const body = tier === 1 ? { bloodGroup: c.bloodGroup, allergies: c.allergies, chronicConditions: c.chronicConditions, currentMedication: c.currentMedication, alerts: c.alerts } : c;
    const jws = await signVcJwt(key, {
      iss, sub: x.humanetId, jti: id, iat: Math.floor(t.getTime() / 1000), nbf: Math.floor(t.getTime() / 1000), exp: Math.floor(expiresAt.getTime() / 1000),
      vc: {
        "@context": ["https://www.w3.org/ns/credentials/v2"], type: ["VerifiableCredential", "ClanclastPatientSummary"], credentialSchema: { id: SUMMARY_FORMAT, type: "JsonSchema" },
        issuer: { id: iss, name: o.name },
        credentialSubject: { id: x.humanetId, name: x.fullName, tier, version, asOf: t.toISOString(), issuedBy: pr.fullName, advisory: "Snapshot as of the date shown. The issuing institution holds the authoritative record.", content: body },
      },
    });
    write((db) => {
      db.issuances.push({ id, patientId: x.id, issuerId: iss, keyId: key.kid, tier, version, synthetic: false, issuedAt: t.toISOString(), expiresAt: expiresAt.toISOString(), revokedAt: null, revokedReason: null });
      addAccess(db, { patientId: x.id, orgId: o.id, providerId: pr.id, action: `Issued you a signed Tier ${tier} summary (v${version})` });
      logActivity(db, { orgId: o.id, actorType: "PROVIDER", actorLabel: pr.fullName, action: `Issued Tier ${tier} summary v${version}`, subjectLabel: x.fullName, status: "Signed" });
    });
    return { id, jws, tier, version, issuedAt: t.toISOString(), expiresAt: expiresAt.toISOString(), patient: { id: x.id, humanetId: x.humanetId, fullName: x.fullName } };
  }, 500),
  revoke: (id: string, reason: "SUPERSEDED" | "ISSUED_IN_ERROR" | "PATIENT_REQUEST" | "KEY_COMPROMISE") => call((): Issued => write((db) => {
    const pr = me(db);
    const row = db.issuances.find((s) => s.id === id && s.issuerId === issuerIdFor(pr.orgId));
    if (!row) throw new DemoError(404, "That summary wasn’t issued by your institution");
    if (!row.revokedAt) {
      row.revokedAt = now(); row.revokedReason = reason;
      addAccess(db, { patientId: row.patientId, orgId: pr.orgId, providerId: pr.id, action: `Revoked your Tier ${row.tier} summary (v${row.version})` });
      logActivity(db, { orgId: pr.orgId, actorType: "PROVIDER", actorLabel: pr.fullName, action: `Revoked Tier ${row.tier} summary v${row.version}`, subjectLabel: reason.replace(/_/g, " ").toLowerCase(), status: "Revoked" });
    }
    const x = db.patients.find((p) => p.id === row.patientId);
    return { id: row.id, tier: row.tier, version: row.version, keyId: row.keyId, issuedAt: row.issuedAt, expiresAt: row.expiresAt, revokedAt: row.revokedAt, revokedReason: row.revokedReason, patient: x ? { id: x.id, fullName: x.fullName, humanetId: x.humanetId } : null };
  })),
};

/** On the website the patient app lives at /patient, on the same origin. */
export const PATIENT_APP_URL = `${typeof window !== "undefined" ? window.location.origin : ""}/patient`;
export const TRUST_REGISTRY_URL = "demo:registry";

// ---------- Connect & FHIR ----------

export type Endpoint = { id: string; label: string; kind: string; baseUrl: string; role: "PRIMARY" | "REPLICA"; status: "UP" | "DEGRADED" | "DOWN" | "UNKNOWN"; lastCheckedAt: string | null; lastLatencyMs: number | null; lastError: string | null; fhirVersion: string | null };
export type ConnectState = {
  organization: { id: string; name: string };
  endpoints: Endpoint[];
  partners: { id: string; name: string; type: string; endpoints: { role: string; status: string; lastCheckedAt: string | null; lastLatencyMs: number | null; fhirVersion: string | null }[] }[];
};
export type Directory = {
  organizations: { id: string; name: string; type: string; status: string; isOwnOrganization: boolean }[];
  outgoing: { id: string; organization: string; status: string; message: string | null; createdAt: string }[];
  incoming: { id: string; organization: string; requestedBy: string; status: string; message: string | null; createdAt: string }[];
};

const epView = (e: DB["endpoints"][number]): Endpoint => ({ id: e.id, label: e.label, kind: e.kind, baseUrl: e.baseUrl, role: e.role, status: e.status, lastCheckedAt: e.lastCheckedAt, lastLatencyMs: e.lastLatencyMs, lastError: e.lastError, fhirVersion: e.fhirVersion });
/** Endpoints in the demo are simulated: a check never leaves the browser. */
function simulateCheck(e: DB["endpoints"][number]) {
  const demoHost = /\.demo(\/|$|:)/.test(e.baseUrl);
  e.lastCheckedAt = now();
  e.lastLatencyMs = demoHost ? 90 + Math.round(Math.random() * 220) : null;
  e.status = demoHost ? (e.status === "DEGRADED" && Math.random() < 0.5 ? "DEGRADED" : "UP") : "UNKNOWN";
  e.lastError = demoHost ? (e.status === "DEGRADED" ? "Slow response" : null) : "Simulated: the demo never contacts real systems";
  e.fhirVersion = demoHost ? "4.0.1" : null;
}

export const connectApi = {
  state: () => call((): ConnectState => {
    const db = read(); const pr = me(db), o = org(db, pr.orgId);
    const partnerIds = db.connections.filter((c) => c.status === "ACCEPTED" && (c.fromOrgId === o.id || c.toOrgId === o.id)).map((c) => (c.fromOrgId === o.id ? c.toOrgId : c.fromOrgId));
    return {
      organization: { id: o.id, name: o.name },
      endpoints: db.endpoints.filter((e) => e.orgId === o.id).sort((a, b) => a.role.localeCompare(b.role)).map(epView),
      partners: db.orgs.filter((g) => partnerIds.includes(g.id)).sort((a, b) => a.name.localeCompare(b.name)).map((g) => ({
        id: g.id, name: g.name, type: g.type,
        endpoints: db.endpoints.filter((e) => e.orgId === g.id).map((e) => ({ role: e.role, status: e.status, lastCheckedAt: e.lastCheckedAt, lastLatencyMs: e.lastLatencyMs, fhirVersion: e.fhirVersion })),
      })),
    };
  }),
  add: (payload: { label: string; baseUrl: string; role: "PRIMARY" | "REPLICA" }) => call(() => write((db) => {
    const pr = me(db);
    if (payload.label.trim().length < 2 || !/^https?:\/\/\S+$/.test(payload.baseUrl.trim())) { const e = new DemoError(400, "Invalid endpoint"); e.details = { fields: ["label", "baseUrl"] }; throw e; }
    const e = { id: uid("ep"), orgId: pr.orgId, label: payload.label.trim(), kind: "FHIR_R4", baseUrl: payload.baseUrl.trim(), role: payload.role, status: "UNKNOWN" as const, lastCheckedAt: null, lastLatencyMs: null, lastError: null, fhirVersion: null, createdAt: now() };
    simulateCheck(e);
    db.endpoints.push(e);
    return epView(e);
  }), 700),
  check: (id: string) => call(() => write((db) => { const pr = me(db); const e = db.endpoints.find((x) => x.id === id && x.orgId === pr.orgId); if (!e) throw new DemoError(404, "Endpoint not found"); simulateCheck(e); return epView(e); }), 600),
  remove: (id: string) => call(() => write((db) => { const pr = me(db); db.endpoints = db.endpoints.filter((x) => !(x.id === id && x.orgId === pr.orgId)); return { ok: true as const }; })),
  directory: () => call(() => directory(read())),
  match: (patient: { name: string; birthDate?: string }) => call(() => {
    const m = demoMatches(read(), { fullName: patient.name, dateOfBirth: patient.birthDate });
    return {
      total: m.length,
      entry: m.map((x) => ({ resource: { id: x.patient.humanetId, name: [{ text: x.patient.fullName }] }, search: { score: x.overallScore, extension: [{ valueCode: x.tier === "auto_link" ? "certain" : "possible" }] } })),
    };
  }, 450),
};
export const FHIR_BASE = "https://api.clanclast.example/fhir";

// ---------- Patient detail ----------

export type PatientDetail = {
  id: string; humanetId: string; fullName: string; dateOfBirth: string; identityVerified: boolean; registeredBy: "staff" | "patient"; createdAt: string;
  emergencyContact: { name: string; relationship: string | null } | null;
  consent: {
    active: { id: string; scope: string[]; duration: string | null; approvedAt: string | null; expiresAt: string | null } | null;
    history: { id: string; scope: string[]; status: string; duration: string | null; createdAt: string; respondedAt: string | null }[];
  };
  summaries: { id: string; tier: 1 | 2; version: number; issuer: string; ownIssuer: boolean; issuedAt: string; expiresAt: string; revokedAt: string | null }[];
  identityLinks: { pairId: string; status: string; score: number; other: { id: string; humanetId: string; fullName: string } | null }[];
  credentials: { id: string; type: string; status: string; issuer: string; issuedAt: string; isOwnOrgCredential: boolean }[];
  access: { id: string; action: string; by: string | null; isEmergency: boolean; createdAt: string }[];
};
export type EmergencyResult = {
  fullName: string; humanetId: string; dateOfBirth: string; identityVerified: boolean;
  emergencyContact: { name: string; relationship: string | null } | null;
  summaryIssuers: { name: string; latest: string | null }[];
};
