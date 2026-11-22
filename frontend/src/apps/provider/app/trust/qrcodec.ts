/**
 * QR transport for signed summaries — the EU Digital COVID Certificate approach:
 *   "CC2:" + Base45( deflate-raw( JWS ) )
 * Base45 uses only QR alphanumeric characters (5.5 bits/char vs 8 in byte mode), and
 * deflate removes JSON redundancy; together a Tier 2 code drops from QR version 31 to 25,
 * which phone cameras read reliably. The signature covers the original JWS bytes, which
 * unpack() restores exactly, so compression never affects verification.
 */
const A = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
export const QR_PREFIX = "CC2:";

function base45(u: Uint8Array) {
  let o = "";
  for (let i = 0; i < u.length; i += 2) {
    if (i + 1 < u.length) {
      let x = u[i] * 256 + u[i + 1];
      const c = x % 45; x = (x - c) / 45;
      const d = x % 45; const e = (x - d) / 45;
      o += A[c] + A[d] + A[e];
    } else {
      const x = u[i];
      o += A[x % 45] + A[(x - (x % 45)) / 45];
    }
  }
  return o;
}

function unbase45(s: string) {
  const out: number[] = [];
  for (let i = 0; i < s.length; i += 3) {
    const [c, d, e] = [A.indexOf(s[i]), A.indexOf(s[i + 1]), i + 2 < s.length ? A.indexOf(s[i + 2]) : -1];
    if (c < 0 || d < 0) throw new Error("Invalid base45");
    if (e >= 0) { const x = c + d * 45 + e * 2025; out.push(x >> 8, x & 255); }
    else out.push(c + d * 45);
  }
  return new Uint8Array(out);
}

async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream) {
  return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(stream)).arrayBuffer());
}

export async function pack(jws: string): Promise<string> {
  if (typeof CompressionStream === "undefined") return `CC1:${jws}`; // older browsers: uncompressed, still valid
  return QR_PREFIX + base45(await pipe(new TextEncoder().encode(jws), new CompressionStream("deflate-raw")));
}

/**
 * For links (the clinic hand-off QR). base45 contains spaces and "%", which a URL
 * would have to escape, so links use base64url. And because a JWS is itself
 * base64, compressing it barely helps; instead the decoded parts are framed and
 * compressed: [u16 header length][header JSON][u16 payload length][payload JSON][signature].
 * unpack() re-encodes them, which reproduces the signed text byte for byte.
 *   "CC4:" + base64url( deflate-raw( frame ) )
 */
const b64urlBytes = (s: string) => { const b = s.replace(/-/g, "+").replace(/_/g, "/"); return Uint8Array.from(atob(b + "===".slice((b.length + 3) % 4)), (c) => c.charCodeAt(0)); };
const bytesB64url = (u: Uint8Array) => { let bin = ""; u.forEach((x) => { bin += String.fromCharCode(x); }); return btoa(bin).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_"); };

export async function packForLink(jws: string): Promise<string> {
  if (typeof CompressionStream === "undefined") return `CC1:${jws}`;
  const [h, p, s] = jws.split(".").map(b64urlBytes);
  const frame = new Uint8Array(4 + h.length + p.length + s.length);
  const dv = new DataView(frame.buffer);
  dv.setUint16(0, h.length); frame.set(h, 2);
  dv.setUint16(2 + h.length, p.length); frame.set(p, 4 + h.length);
  frame.set(s, 4 + h.length + p.length);
  return "CC4:" + bytesB64url(await pipe(frame, new CompressionStream("deflate-raw")));
}

export async function unpack(text: string): Promise<string> {
  if (text.startsWith("CC1:")) return text.slice(4);
  if (text.startsWith("CC4:")) {
    const f = await pipe(b64urlBytes(text.slice(4)), new DecompressionStream("deflate-raw"));
    const dv = new DataView(f.buffer, f.byteOffset, f.byteLength);
    const hl = dv.getUint16(0), pl = dv.getUint16(2 + hl);
    const h = f.subarray(2, 2 + hl), p = f.subarray(4 + hl, 4 + hl + pl), s = f.subarray(4 + hl + pl);
    return `${bytesB64url(h)}.${bytesB64url(p)}.${bytesB64url(s)}`;
  }
  if (!text.startsWith(QR_PREFIX)) throw new Error("Not a CLANCLAST summary code");
  return new TextDecoder().decode(await pipe(unbase45(text.slice(QR_PREFIX.length)), new DecompressionStream("deflate-raw")));
}
