// Thin fetch wrapper around the Humanet backend. Two independent sessions
// (patient / provider) can be stored at once since the UI never shows both
// at the same time, but a user could sign out of one and into the other.

export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

type Session = "patient" | "provider" | "caregiver";

function tokenKey(session: Session) {
  return `humanet_${session}_token`;
}

export function getToken(session: Session): string | null {
  return localStorage.getItem(tokenKey(session));
}

export function setToken(session: Session, token: string) {
  localStorage.setItem(tokenKey(session), token);
}

export function clearToken(session: Session) {
  localStorage.removeItem(tokenKey(session));
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; session?: Session } = {}
): Promise<T> {
  const { method = "GET", body, session } = options;
  const headers: Record<string, string> = {};
  if (body) headers["Content-Type"] = "application/json";
  if (session) {
    const token = getToken(session);
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, (data && data.error) || res.statusText, data?.details);
  }
  return data as T;
}

// ---------- Auth ----------

export const authApi = {
  patientRegister: (payload: {
    fullName: string;
    dateOfBirth: string;
    nationalId: string;
    mobile: string;
    email?: string;
    password: string;
    emergencyContactName?: string;
    emergencyContactRelationship?: string;
    allergies?: string;
    bloodType?: string;
  }) =>
    request<{ token: string; patient: { id: string; humanetId: string; fullName: string; passportCompletion: number } }>(
      "/auth/patient/register",
      { method: "POST", body: payload }
    ),

  patientLogin: (identifier: string, password: string) =>
    request<{ token: string; patient: { id: string; humanetId: string; fullName: string; passportCompletion: number } }>(
      "/auth/patient/login",
      { method: "POST", body: { identifier, password } }
    ),

  me: (session: Session) => request<any>("/auth/me", { session }),

  providerLogin: (email: string, password: string) =>
    request<{
      token: string;
      provider: { id: string; fullName: string; role: string; organization: { id: string; name: string; status: string } };
    }>("/auth/provider/login", { method: "POST", body: { email, password } }),

  caregiverLogin: (phone: string, pin: string) =>
    request<{
      token: string;
      caregiver: { id: string; name: string; relationship: string; patient: { fullName: string; humanetId: string } };
    }>("/auth/caregiver/login", { method: "POST", body: { phone, pin } }),
};

// ---------- Caregiver ----------

export const caregiverApi = {
  patient: () => request<any>("/caregiver/patient", { session: "caregiver" }),
  consent: () => request<any[]>("/caregiver/consent", { session: "caregiver" }),
  approveConsent: (id: string, duration: "ONCE" | "SEVEN_DAYS" | "UNTIL_REVOKED") =>
    request<any>(`/caregiver/consent/${id}/approve`, { method: "POST", body: { duration }, session: "caregiver" }),
  declineConsent: (id: string) =>
    request<any>(`/caregiver/consent/${id}/decline`, { method: "POST", session: "caregiver" }),
};

// ---------- Patient ----------

export const patientApi = {
  passport: () => request<any>("/patient/passport", { session: "patient" }),
  qr: () => request<{ humanetId: string; fullName: string; qrToken: string; expiresInSeconds: number }>("/patient/qr", {
    session: "patient",
  }),
  // GET /patient/qr.png requires a Bearer token, so a plain <img src="..."> can't
  // authenticate. Fetch it manually and hand back an object URL to render instead.
  fetchQrPng: async (): Promise<string> => {
    const token = getToken("patient");
    const res = await fetch(`${BASE_URL}/patient/qr.png`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, "Could not load QR code");
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
  fetchCredentialQr: async (credentialId: string): Promise<string> => {
    const token = getToken("patient");
    const res = await fetch(`${BASE_URL}/patient/credentials/${credentialId}/qr.png`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, "Could not load that verification code");
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
  // GET /patient/health-card.pdf -> fetch and trigger an actual file download,
  // since it also needs the Bearer token that a plain <a href> can't send.
  downloadHealthCard: async (humanetId: string): Promise<void> => {
    const token = getToken("patient");
    const res = await fetch(`${BASE_URL}/patient/health-card.pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, "Could not generate your Health Card");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `humanet-health-card-${humanetId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  records: () => request<any[]>("/patient/records", { session: "patient" }),
  record: (id: string) => request<any>(`/patient/records/${id}`, { session: "patient" }),
  team: () => request<any[]>("/patient/team", { session: "patient" }),
  consent: () => request<any[]>("/patient/consent", { session: "patient" }),
  approveConsent: (id: string, duration: "ONCE" | "SEVEN_DAYS" | "UNTIL_REVOKED") =>
    request<any>(`/patient/consent/${id}/approve`, { method: "POST", body: { duration }, session: "patient" }),
  declineConsent: (id: string) =>
    request<any>(`/patient/consent/${id}/decline`, { method: "POST", session: "patient" }),
  revokeConsent: (id: string) =>
    request<any>(`/patient/consent/${id}/revoke`, { method: "POST", session: "patient" }),
  notifications: () => request<any[]>("/patient/notifications", { session: "patient" }),
  markNotificationRead: (id: string) =>
    request<any>(`/patient/notifications/${id}/read`, { method: "PATCH", session: "patient" }),
  settings: () => request<any>("/patient/profile", { session: "patient" }),
  updateProfile: (payload: Record<string, unknown>) =>
    request<any>("/patient/profile", { method: "PATCH", body: payload, session: "patient" }),
  organizations: () => request<any[]>("/patient/organizations", { session: "patient" }),
  connectOrganization: (organizationId: string) =>
    request<any>("/patient/team/connect", { method: "POST", body: { organizationId }, session: "patient" }),
  caregivers: () => request<any[]>("/patient/caregivers", { session: "patient" }),
  addCaregiver: (payload: { name: string; relationship: string; phone?: string; pin?: string }) =>
    request<any>("/patient/caregivers", { method: "POST", body: payload, session: "patient" }),
  removeCaregiver: (id: string) =>
    request<any>(`/patient/caregivers/${id}`, { method: "DELETE", session: "patient" }),
  accessLog: () => request<any[]>("/patient/access-log", { session: "patient" }),
  acknowledgeAccess: (id: string) =>
    request<any>(`/patient/access-log/${id}/acknowledge`, { method: "POST", session: "patient" }),
  recordSyncRequests: () => request<any[]>("/patient/record-sync", { session: "patient" }),
  approveRecordSync: (id: string) =>
    request<any>(`/patient/record-sync/${id}/approve`, { method: "POST", session: "patient" }),
  declineRecordSync: (id: string) =>
    request<any>(`/patient/record-sync/${id}/decline`, { method: "POST", session: "patient" }),
  medications: () => request<any[]>("/patient/medications", { session: "patient" }),
  // GET /patient/records/:id/attachment requires a Bearer token, so open it via
  // a fetched blob URL in a new tab rather than a plain <a href>.
  viewRecordAttachment: async (recordId: string): Promise<void> => {
    const token = getToken("patient");
    const res = await fetch(`${BASE_URL}/patient/records/${recordId}/attachment`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, "Could not load that attachment");
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), "_blank");
  },
};

// ---------- Provider ----------

export const providerApi = {
  dashboard: () => request<any>("/provider/dashboard", { session: "provider" }),
  patients: (search?: string) =>
    request<any[]>(`/provider/patients${search ? `?search=${encodeURIComponent(search)}` : ""}`, { session: "provider" }),
  patient: (id: string) => request<any>(`/provider/patients/${id}`, { session: "provider" }),
  registerPatient: (payload: {
    fullName: string;
    dateOfBirth: string;
    nationalId: string;
    mobile: string;
    emergencyContactName?: string;
    emergencyContactRelationship?: string;
    allergies?: string;
    bloodType?: string;
  }) => request<{ id: string; humanetId: string; fullName: string }>("/provider/patients/register", { method: "POST", body: payload, session: "provider" }),
  verify: (payload: { humanetId?: string; qrToken?: string }) =>
    request<any>("/provider/verify", { method: "POST", body: payload, session: "provider" }),
  checkinLookup: (payload: { fullName: string; dateOfBirth?: string; mobile?: string; nationalId?: string }) =>
    request<{
      query: typeof payload;
      matches: { patientId: string; humanetId: string; fullName: string; tier: "auto_link" | "escalate" | "distinct"; overallScore: number; explanation: string[] }[];
    }>("/provider/checkin-lookup", { method: "POST", body: payload, session: "provider" }),
  confirmCheckin: (patientId: string) =>
    request<{ id: string; humanetId: string; fullName: string }>("/provider/checkin-lookup/confirm", { method: "POST", body: { patientId }, session: "provider" }),
  requestConsent: (payload: { patientId: string; scope: string[]; reason?: string }) =>
    request<{ id: string; status: string }>("/provider/consent-requests", { method: "POST", body: payload, session: "provider" }),
  consentRequests: () => request<any[]>("/provider/consent-requests", { session: "provider" }),
  resendConsentRequest: (id: string) =>
    request<any>(`/provider/consent-requests/${id}/resend`, { method: "POST", session: "provider" }),
  createReferral: (payload: { patientId: string; toOrganizationId: string; reason: string; urgency?: string; scope?: string[] }) =>
    request<{ id: string; status: string; consentRequestId: string }>("/provider/referrals", { method: "POST", body: payload, session: "provider" }),
  referrals: () => request<any[]>("/provider/referrals", { session: "provider" }),
  connections: () =>
    request<{ organizations: any[]; outgoing: any[]; incoming: any[] }>("/provider/connections", { session: "provider" }),
  connectionDetail: (id: string) => request<any>(`/provider/connections/${id}`, { session: "provider" }),
  simulateSync: (id: string) =>
    request<any>(`/provider/connections/${id}/simulate-sync`, { method: "POST", session: "provider" }),
  inviteConnection: (payload: { toOrganizationId: string; message?: string }) =>
    request<{ id: string; status: string }>("/provider/connections/invite", { method: "POST", body: payload, session: "provider" }),
  acceptConnection: (id: string) =>
    request<any>(`/provider/connections/${id}/accept`, { method: "POST", session: "provider" }),
  declineConnection: (id: string) =>
    request<any>(`/provider/connections/${id}/decline`, { method: "POST", session: "provider" }),
  importRecord: (patientId: string, payload: { issuerOrganizationId: string; type: string; title: string; detail: string; attachmentData?: string; attachmentMimeType?: string; attachmentFileName?: string }) =>
    request<any>(`/provider/patients/${patientId}/records/import`, { method: "POST", body: payload, session: "provider" }),
  activity: () => request<any[]>("/provider/activity", { session: "provider" }),
  notifications: () => request<any[]>("/provider/notifications", { session: "provider" }),
  updateProfile: (payload: { fullName?: string; role?: string }) =>
    request<any>("/provider/profile", { method: "PATCH", body: payload, session: "provider" }),
  issueCredential: (patientId: string, payload: { type: string; status?: string }) =>
    request<{ id: string; type: string; status: string; issuedAt: string }>(`/provider/patients/${patientId}/credentials`, {
      method: "POST",
      body: payload,
      session: "provider",
    }),
  revokeCredential: (id: string) =>
    request<any>(`/provider/credentials/${id}/revoke`, { method: "POST", session: "provider" }),
  prescribeMedication: (patientId: string, payload: { name: string; dosage: string; frequency: string; notes?: string }) =>
    request<any>(`/provider/patients/${patientId}/medications`, { method: "POST", body: payload, session: "provider" }),
  updateMedicationStatus: (id: string, status: "ACTIVE" | "COMPLETED" | "DISCONTINUED") =>
    request<any>(`/provider/medications/${id}`, { method: "PATCH", body: { status }, session: "provider" }),
  // Same pattern as patientApi.viewRecordAttachment - needs the Bearer token,
  // so it's a fetched blob opened in a new tab rather than a plain <a href>.
  viewRecordAttachment: async (patientId: string, recordId: string): Promise<void> => {
    const token = getToken("provider");
    const res = await fetch(`${BASE_URL}/provider/patients/${patientId}/records/${recordId}/attachment`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, "Could not load that attachment");
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), "_blank");
  },
  emergencyAccess: (patientId: string, reason: string) =>
    request<any>(`/provider/patients/${patientId}/emergency-access`, { method: "POST", body: { reason }, session: "provider" }),
};

// ---------- Humanet Connect (public) ----------

export const connectApi = {
  stats: () => request<{ connected: number; pending: number; needsAttention: number; total: number }>("/connect/stats"),
  onboard: (payload: {
    organizationName: string;
    organizationType: string;
    contactName: string;
    contactEmail: string;
    adminFullName: string;
    adminEmail: string;
    adminPassword: string;
  }) =>
    request<{ token: string; provider: any }>("/connect/onboard", { method: "POST", body: payload }),
};

// ---------- Public verification ----------

export const verifyApi = {
  lookup: (humanetId: string) => request<any>("/verify/lookup", { method: "POST", body: { humanetId } }),
  credentialLookup: (credentialId: string) => request<any>("/verify/credential", { method: "POST", body: { credentialId } }),
};
