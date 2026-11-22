import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { Overlay } from "./Overlay";

/** Bottom sheet on phones, centred glass dialog on wide layouts. Escape and scrim close it. */
export function Sheet({ title, children, close, wide = false }: { title: string; children: ReactNode; close: () => void; wide?: boolean }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [close]);
  return (
    <Overlay>
    <div className="fixed inset-0 z-50 flex items-end justify-center @3xl/app:items-center @3xl/app:p-6" onClick={close}>
      <div aria-hidden="true" className="scrim-enter absolute inset-0 bg-[rgb(4_20_18/0.28)] backdrop-blur-[6px]" />
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={title}
        className={`sheet-enter glass-float no-scrollbar relative m-2 max-h-[90%] w-[calc(100%-16px)] overflow-y-auto rounded-[32px] px-5 pb-[calc(var(--safe-bottom)+20px)] pt-2 @3xl/app:pb-6 @3xl/app:pt-5 ${wide ? "@3xl/app:max-w-[600px]" : "@3xl/app:max-w-[480px]"}`}
      >
        <div className="mx-auto mb-3 h-[5px] w-9 rounded-full bg-surface-3 @3xl/app:hidden" />
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-title-3 font-semibold">{title}</h2>
          <button onClick={close} aria-label="Close" className="-mr-1 -mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2 transition-transform duration-150 ease-spring active:scale-90">
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>
        {children}
      </div>
    </div>
    </Overlay>
  );
}
