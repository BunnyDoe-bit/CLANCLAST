/**
 * Offline verification of signed summaries (Blueprint 13.3.5 / 13.3.9).
 * A verifier needs only the cached Trust Registry: issuer public keys + revocation list.
 * The UI always shows how old that list is, because an offline verifier cannot see
 * revocations newer than its last sync.
 */
import { verifyAsync } from "@noble/ed25519";
import { trustApi, type RegistryIssuer, type TrustRegistry } from "../../lib/api";

const CACHE = "cc-trust-registry";

export type SummaryContent = {
  bloodGroup?: string;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedication?: string[];
  alerts?: string[];
  recentDiagnoses?: string[];
  procedures?: string[];
  keyResults?: { name: string; value: string; unit: string; date?: string }[];
  activeReferrals?: string[];
};

export type SummaryPayload = {
  iss: string;
  sub: string;
  jti: string;
  iat: number;
  exp: number;
  vc: {
    synthetic?: boolean;
    issuer: { id: string; name: string };
    credentialSubject: { id: string; name: string; tier: 1 | 2; version: number; asOf: string; advisory: string; issuedBy?: string; content: SummaryContent };
  };
};

export type Verdict = "valid" | "tampered" | "unknown-issuer" | "expired" | "revoked" | "malformed";

export type Verification = {
  verdict: Verdict;
  payload?: SummaryPayload;
  header?: { alg: string; kid: string; typ?: string };
  issuer?: RegistryIssuer;
  revokedAt?: string;
  checkedAt: number;
};

/* ------------------------------------------------------------------ registry cache */

export type RegistrySnapshot = { registry: TrustRegistry; fetchedAt: number; offline: boolean };

function readCache(): RegistrySnapshot | null {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE) || "null");
    return c?.registry ? { ...c, offline: true } : null;
  } catch { return null; }
}

let inflight: Promise<RegistrySnapshot> | null = null;

/** Sync on every connection; fall back to the last cached list when offline. */
export function syncRegistry(): Promise<RegistrySnapshot> {
  inflight ??= trustApi
    .registry()
    .then((registry) => {
      const snap = { registry, fetchedAt: Date.now(), offline: false };
      try { localStorage.setItem(CACHE, JSON.stringify({ registry, fetchedAt: snap.fetchedAt })); } catch { /* ignore */ }
      return snap;
    })
    .catch(() => {
      const cached = readCache();
      if (cached) return cached;
      throw new Error("The trust registry is unavailable and no copy is cached on this device yet.");
    })
    .finally(() => { inflight = null; });
  return inflight;
}

export const cachedRegistry = readCache;

/* ------------------------------------------------------------------ JWS */

const unb64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const b64url = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const json = (s: string) => JSON.parse(new TextDecoder().decode(unb64url(s)));

export function decodeSummary(jws: string): { header: Verification["header"]; payload: SummaryPayload } | null {
  try {
    const [h, p] = jws.split(".");
    return { header: json(h), payload: json(p) };
  } catch { return null; }
}

export async function verifySummary(jws: string, registry: TrustRegistry, now = Date.now()): Promise<Verification> {
  const checkedAt = now;
  const parts = jws.split(".");
  const decoded = decodeSummary(jws);
  if (parts.length !== 3 || !decoded || decoded.header?.alg !== "EdDSA") return { verdict: "malformed", checkedAt };
  const { header, payload } = decoded;

  const issuer = registry.issuers.find((i) => i.id === payload.iss && i.status === "ACTIVE");
  // A rotated (RETIRED) key still verifies what it signed; a REVOKED key was compromised, so nothing it signed counts.
  const key = issuer?.keys.find((k) => k.kid === header!.kid);
  if (!issuer || !key) return { verdict: "unknown-issuer", header, payload, checkedAt };
  if (key.status === "REVOKED") return { verdict: "revoked", header, payload, issuer, checkedAt };
  if (key.status !== "ACTIVE" && key.status !== "RETIRED") return { verdict: "unknown-issuer", header, payload, checkedAt };

  let ok = false;
  try {
    ok = await verifyAsync(unb64url(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`), unb64url(key.publicKeyJwk.x));
  } catch { ok = false; }
  if (!ok) return { verdict: "tampered", header, payload, issuer, checkedAt };

  const revoked = registry.revocations.find((r) => r.id === payload.jti);
  if (revoked) return { verdict: "revoked", header, payload, issuer, revokedAt: revoked.revokedAt, checkedAt };
  if (payload.exp * 1000 < now) return { verdict: "expired", header, payload, issuer, checkedAt };
  return { verdict: "valid", header, payload, issuer, checkedAt };
}

/**
 * Demonstration only: change one clinical field and re-encode the payload while keeping the
 * original signature — exactly what someone editing a summary on their phone would produce.
 */
export function tamper(jws: string): { jws: string; field: string; from: string; to: string } {
  const [h, p, s] = jws.split(".");
  const payload = json(p) as SummaryPayload;
  const c = payload.vc.credentialSubject.content;
  const from = c.bloodGroup ?? "—";
  const to = from === "AB−" ? "O+" : "AB−";
  c.bloodGroup = to;
  return { jws: `${h}.${b64url(new TextEncoder().encode(JSON.stringify(payload)))}.${s}`, field: "Blood group", from, to };
}
