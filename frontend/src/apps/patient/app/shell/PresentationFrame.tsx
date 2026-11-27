import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { setPrefs } from "../lib/preferences";
import { OverlayRoot } from "../ui/Overlay";

const W = 393, H = 852; // iPhone 15/16 logical size

/**
 * Optional device frame for investor demos (toggle in the account menu or with ?present=1).
 * The app inside is a real @container, so it renders its phone layout regardless of window width.
 * Disabled automatically on narrow screens, where the real device is the frame.
 */
export function PresentationFrame({ children }: { children: ReactNode }) {
  const [k, setK] = useState(1);
  const [wide, setWide] = useState(true);

  useEffect(() => {
    const fit = () => {
      setWide(window.innerWidth >= 768);
      setK(Math.min(1, (window.innerHeight - 48) / (H + 24), (window.innerWidth - 48) / (W + 24)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  if (!wide) return <div className="@container/app relative h-full">{children}<OverlayRoot /></div>;

  return (
    <div className="grid h-full place-items-center overflow-hidden bg-[color-mix(in_srgb,var(--canvas)_88%,var(--ink))]">
      <button onClick={() => setPrefs({ present: false })} className="btn btn-quiet fixed right-5 top-5 z-50 h-9 min-h-0 px-3 text-footnote">
        <X size={15} /> Exit presentation
      </button>
      <div style={{ width: (W + 24) * k, height: (H + 24) * k }}>
        <div
          className="rounded-[64px] bg-[#0b1110] p-3 shadow-[0_0_0_1.5px_#2a3230,0_40px_80px_-24px_rgb(7_43_39/0.45)]"
          style={{ width: W + 24, height: H + 24, transform: `scale(${k})`, transformOrigin: "0 0" }}
        >
          <div
            className="@container/app relative h-full w-full overflow-hidden rounded-[52px] bg-canvas [transform:translateZ(0)]"
            style={{ "--safe-top": "54px", "--safe-bottom": "28px" } as React.CSSProperties}
          >
            {children}
            <OverlayRoot />
            <StatusBar />
            <i aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[11px] z-[60] h-[35px] w-[124px] -translate-x-1/2 rounded-full bg-black" />
            <i aria-hidden="true" className="pointer-events-none absolute bottom-2 left-1/2 z-[60] h-[5px] w-[136px] -translate-x-1/2 rounded-full bg-white mix-blend-difference" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div aria-hidden="true" className="tnum pointer-events-none absolute inset-x-0 top-0 z-[59] flex h-[54px] items-center justify-between px-[38px] pt-1 text-[16px] font-semibold text-white mix-blend-difference">
      <span>9:41</span>
      <span className="flex items-center gap-1.5">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="7" rx="1" /><rect x="10" y="2.5" width="3" height="9.5" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1.5 4.3a10 10 0 0 1 14 0M4 7a6.4 6.4 0 0 1 9 0" /><circle cx="8.5" cy="10" r="1.2" fill="currentColor" stroke="none" /></svg>
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x=".5" y=".5" width="22" height="12" rx="3.6" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="19" height="9" rx="2.4" fill="currentColor" /><path d="M24.5 4.5v4c.8-.3 1.5-1 1.5-2s-.7-1.7-1.5-2z" fill="currentColor" opacity=".45" /></svg>
      </span>
    </div>
  );
}
