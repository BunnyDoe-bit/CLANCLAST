import { useEffect, useState, type CSSProperties } from "react";
import { resetDemo } from "./db";

/**
 * A small, always-present marker on the live product demos: says plainly that the data
 * is fictional and stays in this browser, and offers a reset and the way back to the site.
 * Styled inline so it works inside either app's design system. Hidden when a demo is
 * embedded on the landing page (?embed=1), where the frame itself carries the label.
 */
export function DemoBar({ app }: { app: "patient" | "provider" }) {
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.innerWidth >= 900);
  const embedded = typeof window !== "undefined" && (new URLSearchParams(window.location.search).has("embed") || window.self !== window.top);
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= 900);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  if (embedded) return null;

  const pos: CSSProperties = wide ? { right: 16, bottom: 16 } : app === "patient" ? { left: 10, bottom: "calc(env(safe-area-inset-bottom, 0px) + 92px)" } : { left: 10, bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" };
  const shell: CSSProperties = {
    position: "fixed", zIndex: 2147483000, ...pos, fontFamily: '-apple-system, BlinkMacSystemFont, "Inter Variable", "Inter", "Segoe UI", Roboto, system-ui, sans-serif',
    color: "#eafbf8", background: "rgb(7 43 39 / 0.92)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
    border: "1px solid rgb(141 212 202 / 0.22)", borderRadius: open ? 18 : 999, boxShadow: "0 12px 32px -12px rgb(0 0 0 / 0.45)",
    padding: open ? "14px 16px" : "7px 12px 7px 10px", maxWidth: 300, fontSize: 12, lineHeight: 1.4,
  };
  const link: CSSProperties = { color: "#8dd4ca", fontWeight: 600, textDecoration: "none", background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit" };
  return (
    <div role="note" aria-label="Demonstration" style={shell}>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{ ...link, color: "#eafbf8", display: "flex", alignItems: "center", gap: 8 }} aria-expanded="false">
          <span style={{ width: 7, height: 7, borderRadius: 99, background: "#5cbbae", boxShadow: "0 0 0 3px rgb(92 187 174 / 0.25)" }} />
          Live demo · fictional data
        </button>
      ) : (
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>This is the real CLANCLAST {app === "patient" ? "patient app" : "provider workspace"}</p>
          <p style={{ margin: "4px 0 10px", color: "#a3c2bd" }}>Running on fictional data that stays in this browser. Nothing you enter is sent anywhere.</p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <a href={app === "patient" ? "/provider" : "/patient"} style={link}>Open the {app === "patient" ? "provider workspace" : "patient app"}</a>
            <button style={link} onClick={() => { resetDemo(); window.location.href = `/${app}`; }}>Reset demo</button>
            <a href="/" style={link}>← clanclast site</a>
            <button style={{ ...link, color: "#a3c2bd" }} onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
