/**
 * Summary vault — on-device, encrypted storage for patient-held signed summaries
 * (Blueprint 13.3.4: "encrypted on the device behind a PIN or biometric unlock").
 *
 * Key hierarchy
 *   DEK  random 256-bit AES-GCM key that encrypts the summaries.
 *   KEK  wraps the DEK. One per unlock method:
 *        - PIN:       PBKDF2-SHA256 (600k iterations, random salt) of the 6-digit PIN.
 *        - Biometric: WebAuthn PRF output (a secret released only after on-device
 *                     Face ID / fingerprint) → HKDF. Biometrics never leave the device
 *                     and are never sent to CLANCLAST (biometric *credentials* are out of scope).
 * The DEK exists in memory only while unlocked and is dropped on lock, sign-out,
 * inactivity or when the app is backgrounded.
 *
 * Honest limits: a 6-digit PIN protects against casual access to a lost phone,
 * not a forensic attacker with the device's storage — which is why Tier 2 is
 * short-lived and lost devices are handled by revocation.
 */
import { useSyncExternalStore } from "react";

const DB = "clanclast-vault";
const STORE = "kv";
const PBKDF2_ITERATIONS = 600_000;
const AUTO_LOCK_IDLE_MS = 5 * 60_000;
const AUTO_LOCK_HIDDEN_MS = 30_000;
export const PIN_LENGTH = 6;

type Sealed = { iv: string; ct: string };
type Meta = {
  v: 1;
  salt: string;
  iterations: number;
  pin: Sealed;                                       // DEK sealed under the PIN key
  bio?: { credentialId: string; prfSalt: string; sealed: Sealed };
  fails: number;
  lockedUntil: number;
};
export type VaultItem = { id: string; jws: string; addedAt: string };

/* ------------------------------------------------------------------ tiny IndexedDB */

let dbp: Promise<IDBDatabase> | null = null;
function db() {
  dbp ??= new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return dbp;
}
async function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const req = fn(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}
const get = <T,>(k: string) => idb<T | undefined>("readonly", (s) => s.get(k));
const put = (k: string, v: unknown) => idb("readwrite", (s) => s.put(v, k));
const del = (k: string) => idb("readwrite", (s) => s.delete(k));

/* ------------------------------------------------------------------ crypto helpers */

const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = (u: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(u instanceof Uint8Array ? u : new Uint8Array(u))));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const rand = (n: number) => crypto.getRandomValues(new Uint8Array(n));

async function aesKey(raw: Uint8Array, usages: KeyUsage[] = ["encrypt", "decrypt"]) {
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, usages);
}
async function seal(key: CryptoKey, data: Uint8Array, aad: string): Promise<Sealed> {
  const iv = rand(12);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(aad) }, key, data);
  return { iv: b64(iv), ct: b64(ct) };
}
async function open(key: CryptoKey, s: Sealed, aad: string) {
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(s.iv), additionalData: enc.encode(aad) }, key, unb64(s.ct)));
}
async function pinKey(pin: string, salt: Uint8Array, iterations: number) {
  const base = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function prfKey(prfOutput: ArrayBuffer) {
  const base = await crypto.subtle.importKey("raw", prfOutput, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: enc.encode("clanclast-vault"), info: enc.encode("bio-kek-v1") }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

/* ------------------------------------------------------------------ session state (observable) */

export type VaultState =
  | { status: "loading" }
  | { status: "absent" }
  | { status: "locked"; biometric: boolean; lockedUntil: number; fails: number }
  | { status: "unlocked"; biometric: boolean; items: VaultItem[] };

let owner = "";                         // patient the vault belongs to (CLANCLAST ID)
let dek: Uint8Array | null = null;      // raw DEK, in memory only while unlocked
let dekKey: CryptoKey | null = null;
let state: VaultState = { status: "loading" };
const listeners = new Set<() => void>();
const emit = (s: VaultState) => { state = s; listeners.forEach((l) => l()); };

export function useVault(): VaultState {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => state);
}

const metaKey = () => `meta:${owner}`;
const itemsKey = () => `items:${owner}`;

export async function loadVault(patientId: string) {
  if (owner === patientId && state.status !== "loading") return;
  if (owner !== patientId) lock();
  owner = patientId;
  const meta = await get<Meta>(metaKey());
  emit(meta ? { status: "locked", biometric: !!meta.bio, lockedUntil: meta.lockedUntil, fails: meta.fails } : { status: "absent" });
}

async function readItems(): Promise<VaultItem[]> {
  const sealed = await get<Sealed>(itemsKey());
  if (!sealed || !dekKey) return [];
  return JSON.parse(dec.decode(await open(dekKey, sealed, itemsKey())));
}
async function writeItems(items: VaultItem[]) {
  if (!dekKey) throw new Error("Vault is locked");
  await put(itemsKey(), await seal(dekKey, enc.encode(JSON.stringify(items)), itemsKey()));
}

async function becomeUnlocked(raw: Uint8Array, meta: Meta) {
  dek = raw;
  dekKey = await aesKey(raw);
  if (meta.fails || meta.lockedUntil) await put(metaKey(), { ...meta, fails: 0, lockedUntil: 0 });
  emit({ status: "unlocked", biometric: !!meta.bio, items: await readItems() });
  armAutoLock();
}

/* ------------------------------------------------------------------ setup / unlock / lock */

export async function createVault(pin: string) {
  const salt = rand(16);
  const raw = rand(32);
  const meta: Meta = { v: 1, salt: b64(salt), iterations: PBKDF2_ITERATIONS, pin: await seal(await pinKey(pin, salt, PBKDF2_ITERATIONS), raw, metaKey()), fails: 0, lockedUntil: 0 };
  await put(metaKey(), meta);
  await becomeUnlocked(raw, meta);
}

/** Escalating delay after 5 wrong PINs: 30 s, 60 s, 2 min … capped at 1 h. */
function backoff(fails: number) {
  return fails < 5 ? 0 : Math.min(30_000 * 2 ** (fails - 5), 3_600_000);
}

export type UnlockResult = { ok: true } | { ok: false; reason: "wrong" | "throttled"; retryAt?: number; attemptsLeft?: number };

export async function unlockWithPin(pin: string): Promise<UnlockResult> {
  const meta = await get<Meta>(metaKey());
  if (!meta) throw new Error("No vault");
  if (meta.lockedUntil > Date.now()) return { ok: false, reason: "throttled", retryAt: meta.lockedUntil };
  try {
    const raw = await open(await pinKey(pin, unb64(meta.salt), meta.iterations), meta.pin, metaKey());
    await becomeUnlocked(raw, meta);
    return { ok: true };
  } catch {
    const fails = meta.fails + 1;
    const lockedUntil = backoff(fails) ? Date.now() + backoff(fails) : 0;
    await put(metaKey(), { ...meta, fails, lockedUntil });
    emit({ status: "locked", biometric: !!meta.bio, lockedUntil, fails });
    return { ok: false, reason: lockedUntil ? "throttled" : "wrong", retryAt: lockedUntil || undefined, attemptsLeft: Math.max(0, 5 - fails) };
  }
}

export function lock() {
  dek?.fill(0);
  dek = null;
  dekKey = null;
  disarmAutoLock();
  if (state.status === "unlocked") emit({ status: "locked", biometric: state.biometric, lockedUntil: 0, fails: 0 });
}

/** Removes every trace of this patient's vault from the device. Signed summaries can be re-issued. */
export async function eraseVault() {
  lock();
  await Promise.all([del(metaKey()), del(itemsKey())]);
  emit({ status: "absent" });
}

/* ------------------------------------------------------------------ biometric (WebAuthn PRF) */

export async function biometricAvailable(): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential || !window.isSecureContext) return false;
    const caps = (PublicKeyCredential as any).getClientCapabilities ? await (PublicKeyCredential as any).getClientCapabilities() : null;
    if (caps && caps["extension:prf"] === false) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
}

async function prfAssert(credentialId: Uint8Array, prfSalt: Uint8Array): Promise<ArrayBuffer | null> {
  const cred = (await navigator.credentials.get({
    publicKey: {
      challenge: rand(32),
      allowCredentials: [{ type: "public-key", id: credentialId }],
      userVerification: "required",
      timeout: 60_000,
      extensions: { prf: { eval: { first: prfSalt } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  const out = (cred?.getClientExtensionResults() as any)?.prf?.results?.first;
  return out ?? null;
}

export type BioResult = { ok: true } | { ok: false; reason: "unsupported" | "cancelled" };

/** Enrol Face ID / fingerprint. Must be called while unlocked (it wraps the in-memory DEK). */
export async function enableBiometric(displayName: string): Promise<BioResult> {
  if (!dek) throw new Error("Vault is locked");
  const meta = await get<Meta>(metaKey());
  if (!meta) throw new Error("No vault");
  const prfSalt = rand(32);
  try {
    const created = (await navigator.credentials.create({
      publicKey: {
        rp: { name: "CLANCLAST Health" },
        user: { id: rand(16), name: owner, displayName },
        challenge: rand(32),
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
        timeout: 60_000,
        extensions: { prf: { eval: { first: prfSalt } } } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null;
    if (!created) return { ok: false, reason: "cancelled" };
    const ext = created.getClientExtensionResults() as any;
    if (!ext?.prf?.enabled && !ext?.prf?.results) return { ok: false, reason: "unsupported" };
    const id = new Uint8Array(created.rawId);
    // Some platforms only release PRF output on assertion, so always derive from a fresh one.
    const out = ext.prf.results?.first ?? (await prfAssert(id, prfSalt));
    if (!out) return { ok: false, reason: "unsupported" };
    const sealed = await seal(await prfKey(out), dek, metaKey());
    const next: Meta = { ...meta, bio: { credentialId: b64(id), prfSalt: b64(prfSalt), sealed } };
    await put(metaKey(), next);
    if (state.status === "unlocked") emit({ ...state, biometric: true });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: (e as DOMException)?.name === "NotAllowedError" ? "cancelled" : "unsupported" };
  }
}

export async function unlockWithBiometric(): Promise<BioResult> {
  const meta = await get<Meta>(metaKey());
  if (!meta?.bio) return { ok: false, reason: "unsupported" };
  try {
    const out = await prfAssert(unb64(meta.bio.credentialId), unb64(meta.bio.prfSalt));
    if (!out) return { ok: false, reason: "unsupported" };
    await becomeUnlocked(await open(await prfKey(out), meta.bio.sealed, metaKey()), meta);
    return { ok: true };
  } catch {
    return { ok: false, reason: "cancelled" };
  }
}

export async function disableBiometric() {
  const meta = await get<Meta>(metaKey());
  if (!meta) return;
  const { bio: _drop, ...rest } = meta;
  await put(metaKey(), rest);
  if (state.status === "unlocked") emit({ ...state, biometric: false });
}

/* ------------------------------------------------------------------ items */

export async function addItem(item: VaultItem) {
  const items = [item, ...(await readItems()).filter((i) => i.id !== item.id)];
  await writeItems(items);
  if (state.status === "unlocked") emit({ ...state, items });
}

export async function removeItem(id: string) {
  const items = (await readItems()).filter((i) => i.id !== id);
  await writeItems(items);
  if (state.status === "unlocked") emit({ ...state, items });
}

/* ------------------------------------------------------------------ auto-lock */

let idleTimer = 0;
let hiddenAt = 0;
const resetIdle = () => { clearTimeout(idleTimer); idleTimer = window.setTimeout(lock, AUTO_LOCK_IDLE_MS); };
const onVisibility = () => {
  if (document.hidden) hiddenAt = Date.now();
  else if (hiddenAt && Date.now() - hiddenAt > AUTO_LOCK_HIDDEN_MS) lock();
};
function armAutoLock() {
  disarmAutoLock();
  resetIdle();
  window.addEventListener("pointerdown", resetIdle, { passive: true });
  window.addEventListener("keydown", resetIdle);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", lock);
}
function disarmAutoLock() {
  clearTimeout(idleTimer);
  window.removeEventListener("pointerdown", resetIdle);
  window.removeEventListener("keydown", resetIdle);
  document.removeEventListener("visibilitychange", onVisibility);
  window.removeEventListener("pagehide", lock);
}
