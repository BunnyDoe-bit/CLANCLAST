/** South African ID: 13 digits, YYMMDD prefix, Luhn checksum. Returns the date of birth when valid. */
export function checkSaId(raw: string): { ok: boolean; dob?: string } {
  const id = raw.replace(/\s/g, "");
  if (!/^\d{13}$/.test(id)) return { ok: false };
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let d = +id[12 - i];
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  if (sum % 10 !== 0) return { ok: false };
  const yy = +id.slice(0, 2), mm = +id.slice(2, 4), dd = +id.slice(4, 6);
  const year = yy + (yy > new Date().getFullYear() % 100 ? 1900 : 2000);
  const date = new Date(Date.UTC(year, mm - 1, dd));
  if (date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd) return { ok: false };
  return { ok: true, dob: `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}` };
}

/** "082 555 0198" → "+27825550198"; anything else is passed through trimmed. */
export function normaliseMobile(m: string) {
  const c = m.replace(/[\s-]/g, "");
  return /^0\d{9}$/.test(c) ? `+27${c.slice(1)}` : c;
}

/**
 * What a scanner or a person typed into the code field. The patient app's
 * identity QR is JSON `{ humanetId, token }`; a printed card or a person may
 * give just the CLANCLAST ID.
 */
export function parseCode(raw: string): { qrToken?: string; humanetId?: string } | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const j = JSON.parse(t);
    if (j && typeof j.token === "string") return { qrToken: j.token };
    if (j && typeof j.humanetId === "string") return { humanetId: j.humanetId };
  } catch { /* not JSON */ }
  const id = t.toUpperCase().replace(/\s/g, "");
  if (/^[A-Z]{2}-?\d{4}-?\d{4}$/.test(id)) return { humanetId: id.replace(/^([A-Z]{2})-?(\d{4})-?(\d{4})$/, "$1-$2-$3") };
  return null;
}

export const DOCUMENTS = [
  { v: "SA_ID", label: "SA ID" },
  { v: "PASSPORT", label: "Passport" },
  { v: "OTHER", label: "Other" },
] as const;

/** Prefill handed from Check-in to Register in memory, so ID numbers never go into the URL. */
let handoff: Partial<{ fullName: string; dateOfBirth: string; mobile: string; nationalId: string }> | null = null;
export const setHandoff = (h: typeof handoff) => { handoff = h; };
export const takeHandoff = () => { const h = handoff; handoff = null; return h; };
