/**
 * On-device verification of the hash-chained access log. Mirrors
 * patient-backend/src/lib/auditChain.ts byte for byte, so the patient's phone
 * checks every link itself instead of trusting the server's "intact".
 *
 * Device memory: the head (seq + hash) verified last time is kept per patient.
 * If a later response no longer contains that exact entry, someone has
 * rewritten or truncated history — even if they recomputed the whole chain.
 */
export const GENESIS = "0".repeat(64);

export type ChainFields = { v: number; seq: number; prevHash: string; hash: string; patientId: string; organizationId: string; providerId: string };
export type ChainedEntry = { id: string; action: string; isEmergency: boolean; reason: string | null; createdAt: string; chain: ChainFields | null };

export type Integrity =
  | { state: "intact"; length: number; head: { seq: number; hash: string }; since?: string; unsealed: number; partial: boolean }
  | { state: "broken"; seq: number; reason: "hash-mismatch" | "broken-link" | "gap"; length: number }
  | { state: "rewritten"; seq: number; reason: "missing" | "changed"; rememberedAt: string }
  | { state: "empty"; unsealed: number };

const canonical = (e: ChainedEntry, c: ChainFields) =>
  JSON.stringify([c.v, c.seq, c.prevHash, c.patientId, c.organizationId, c.providerId, e.action, e.isEmergency, e.reason ?? null, new Date(e.createdAt).toISOString()]);

async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

type Memory = { seq: number; hash: string; at: string; since: string };
const key = (patientId: string) => `cc-audit-head:${patientId}`;
const recall = (patientId: string): Memory | null => { try { return JSON.parse(localStorage.getItem(key(patientId)) || "null"); } catch { return null; } };
const remember = (patientId: string, m: Memory) => { try { localStorage.setItem(key(patientId), JSON.stringify(m)); } catch { /* ignore */ } };

export async function verifyOnDevice(entries: ChainedEntry[]): Promise<Integrity> {
  const sealed = entries.filter((e) => e.chain).sort((a, b) => a.chain!.seq - b.chain!.seq);
  const unsealed = entries.length - sealed.length;
  if (!sealed.length) return { state: "empty", unsealed };

  // 1) Every entry's hash, and every link to the one before it.
  let prev: string | null = null;
  for (let i = 0; i < sealed.length; i++) {
    const e = sealed[i], c = e.chain!;
    if (i > 0 && c.seq !== sealed[i - 1].chain!.seq + 1) return { state: "broken", seq: c.seq, reason: "gap", length: sealed.length };
    if (i === 0 && c.seq === 1 && c.prevHash !== GENESIS) return { state: "broken", seq: 1, reason: "broken-link", length: sealed.length };
    if (prev !== null && c.prevHash !== prev) return { state: "broken", seq: c.seq, reason: "broken-link", length: sealed.length };
    if ((await sha256(canonical(e, c))) !== c.hash) return { state: "broken", seq: c.seq, reason: "hash-mismatch", length: sealed.length };
    prev = c.hash;
  }

  // 2) Nothing this device has already seen may disappear or change.
  const patientId = sealed[0].chain!.patientId;
  const head = sealed[sealed.length - 1].chain!;
  const mem = recall(patientId);
  if (mem) {
    const seen = sealed.find((e) => e.chain!.seq === mem.seq);
    if (!seen && mem.seq > head.seq) return { state: "rewritten", seq: mem.seq, reason: "missing", rememberedAt: mem.at };
    if (seen && seen.chain!.hash !== mem.hash) return { state: "rewritten", seq: mem.seq, reason: "changed", rememberedAt: mem.at };
  }
  const since = mem?.since ?? new Date().toISOString();
  remember(patientId, { seq: head.seq, hash: head.hash, at: new Date().toISOString(), since });
  return { state: "intact", length: sealed.length, head: { seq: head.seq, hash: head.hash }, since: mem ? since : undefined, unsealed, partial: sealed[0].chain!.seq !== 1 };
}
