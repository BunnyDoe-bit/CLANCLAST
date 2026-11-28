import { useMemo } from "react";
import { encode } from "uqr";

/** A QR code drawn as SVG, for the closing slide's "try it yourself" address. */
export function QrCode({ text, size = 168 }: { text: string; size?: number }) {
  const { d, n } = useMemo(() => {
    const qr = encode(text, { ecc: "M", border: 1 });
    let path = "";
    qr.data.forEach((row, y) => row.forEach((on, x) => { if (on) path += `M${x} ${y}h1v1h-1z`; }));
    return { d: path, n: qr.size };
  }, [text]);
  return (
    <svg className="qr" width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" role="img" aria-label={`QR code for ${text}`}>
      <rect width={n} height={n} fill="#fff" /><path d={d} fill="#072b27" />
    </svg>
  );
}
