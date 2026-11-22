import { memo, useMemo } from "react";
import { encode } from "uqr";

/** Crisp SVG QR (one path, merged runs): scales to any screen without blur. */
export const QrSvg = memo(function QrSvg({ text, label }: { text: string; label: string }) {
  const { d, size } = useMemo(() => {
    const qr = encode(text, { ecc: "L", border: 0 });
    let path = "";
    qr.data.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        if (!row[x]) { x++; continue; }
        let w = 1;
        while (x + w < row.length && row[x + w]) w++;
        path += `M${x} ${y}h${w}v1h-${w}z`;
        x += w;
      }
    });
    return { d: path, size: qr.size };
  }, [text]);
  return (
    <svg viewBox={`-2 -2 ${size + 4} ${size + 4}`} role="img" aria-label={label} className="aspect-square w-full" shapeRendering="crispEdges">
      <rect x="-2" y="-2" width={size + 4} height={size + 4} fill="#fff" />
      <path d={d} fill="#072b27" />
    </svg>
  );
});
