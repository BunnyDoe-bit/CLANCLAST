import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/**
 * Overlays (sheets, dialogs) render into #overlay-root at the app container's root, so a
 * transformed or animated ancestor can never trap a `position: fixed` layer, and container
 * queries / the presentation frame still apply.
 */
export function Overlay({ children }: { children: ReactNode }) {
  const root = typeof document !== "undefined" ? document.getElementById("overlay-root") : null;
  return root ? createPortal(children, root) : <>{children}</>;
}

export const OverlayRoot = () => <div id="overlay-root" />;
