/**
 * Offline verification of patient-held summaries (Blueprint §13.3.5): a verifier
 * needs only the Trust Registry, cached on this device, to check any summary,
 * even when the issuing institution's system is down. The screen always shows
 * how old the cached list is, because an offline verifier can't see revocations
 * newer than its last sync (risk register: offline revocation lag).
 */
import { verifyAsync } from "@noble/ed25519";
import { type SummaryContent } from "../../lib/api";
import { registry as demoRegistry } from "../../../../demo/db";

export type RegistryKey = { kid: string; alg: string; status: "ACTIVE" | "RETIRED" | "REVOKED" | string; publicKeyJwk: { x: string } };
export type RegistryIssuer = { id: string; name: string; kind: "SYNTHETIC" | "INSTITUTION"; status: string; note?: string; keys: RegistryKey[] };
export type TrustRegistry = { version: number; generatedAt: string; issuers: RegistryIssuer[]; revocations: { id: string; revokedAt: string }[] };
export type Snapshot = { registry: TrustRegistry; fetchedAt: number; offline: boolean };

export type Payload = {
  iss: string; sub: string; jti: string; iat: number; exp: number;
  vc: { synthetic?: boolean; issuer: { id: string; name: string }; credentialSubject: { id: string; name: string; tier: 1 | 2; version: number; asOf: string; advisory: string; issuedBy?: string; content: SummaryContent } };
};
export type Verdict = "valid" | "tampered" | "unknown-issuer" | "expired" | "revoked" | "key-revoked" | "malformed";
export type Verification = { verdict: Verdict; payload?: Payload; issuer?: RegistryIssuer; keyStatus?: string; revokedAt?: string };

const CACHE = "cc-provider-trust-registry";

function readCache(): Snapshot | null {
  try { const c = JSON.parse(localStorage.getItem(CACHE) || "null"); return c?.registry ? { ...c, offline: true } : null; } catch { return null; }
}
export const cachedRegistry = readCache;

let inflight: Promise<Snapshot> | null = null;
/** Sync on every connection; fall back to the cached copy when offline. */
export function syncRegistry(): Promise<Snapshot> {
  // Website demo: the registry comes from the in-browser demo backend.
  inflight ??= demoRegistry()
    .then(async (r) => {
      const registry = r as unknown as TrustRegistry;
      const snap = { registry, fetchedAt: Date.now(), offline: false };
      try { localStorage.setItem(CACHE, JSON.stringify({ registry, fetchedAt: snap.fetchedAt })); } catch { /* ignore */ }
      return snap;
    })
    .catch(() => {
      const c = readCache();
      if (c) return c;
      throw new Error("The Trust Registry can’t be reached and this device has no saved copy yet. Connect once to download it.");
    })
    .finally(() => { inflight = null; });
  return inflight;
}

const unb64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const json = (s: string) => JSON.parse(new TextDecoder().decode(unb64url(s)));

export function decode(jws: string): { header: { alg: string; kid: string }; payload: Payload } | null {
  try { const [h, p] = jws.split("."); return { header: json(h), payload: json(p) }; } catch { return null; }
}

export async function verify(jws: string, registry: TrustRegistry, now = Date.now()): Promise<Verification> {
  const parts = jws.split(".");
  const d = decode(jws);
  if (parts.length !== 3 || !d || d.header.alg !== "EdDSA") return { verdict: "malformed" };
  const { header, payload } = d;
  const issuer = registry.issuers.find((i) => i.id === payload.iss && i.status === "ACTIVE");
  const key = issuer?.keys.find((k) => k.kid === header.kid);
  if (!issuer || !key) return { verdict: "unknown-issuer", payload };
  let ok = false;
  try { ok = await verifyAsync(unb64url(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`), unb64url(key.publicKeyJwk.x)); } catch { ok = false; }
  if (!ok) return { verdict: "tampered", payload, issuer, keyStatus: key.status };
  if (key.status === "REVOKED") return { verdict: "key-revoked", payload, issuer, keyStatus: key.status };
  const revoked = registry.revocations.find((r) => r.id === payload.jti);
  if (revoked) return { verdict: "revoked", payload, issuer, revokedAt: revoked.revokedAt, keyStatus: key.status };
  if (payload.exp * 1000 < now) return { verdict: "expired", payload, issuer, keyStatus: key.status };
  return { verdict: "valid", payload, issuer, keyStatus: key.status };
}
