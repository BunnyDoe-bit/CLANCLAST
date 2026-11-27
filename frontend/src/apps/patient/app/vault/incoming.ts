/**
 * A summary handed over at a clinic. The provider app shows a QR code holding a
 * link to this app with the signed summary in the URL *fragment*
 * (…/vault#add=CC2:…). Browsers never send the fragment to any server, so the
 * document goes straight from the clinic's screen to this device: CLANCLAST
 * never holds it (Canon Rule 8).
 *
 * It's read once at start-up and removed from the address bar at once, then
 * kept in memory until the vault is unlocked and the patient accepts or declines.
 */
let incoming: string | null = null;

(function capture() {
  if (typeof window === "undefined") return;
  const m = window.location.hash.match(/^#add=(.+)$/);
  if (!m) return;
  try { incoming = decodeURIComponent(m[1]); } catch { incoming = m[1]; }
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
})();

const listeners = new Set<() => void>();
export const peekIncoming = () => incoming;
export const hasIncoming = () => incoming !== null;
export function clearIncoming() { incoming = null; listeners.forEach((l) => l()); }
export function onIncomingChange(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
