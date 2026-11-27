import { memo, useCallback, useEffect, useState, type ReactNode } from "react";
import { Delete } from "lucide-react";
import { PIN_LENGTH } from "./vault";

type Props = {
  title: string;
  hint?: ReactNode;
  error?: string;
  busy?: boolean;
  disabled?: boolean;
  /** Bottom-left key, e.g. a biometric button. */
  aux?: ReactNode;
  onComplete: (pin: string) => void;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * iOS-style passcode pad. Hardware keyboard works too. The PIN never leaves this component
 * except via onComplete. Parents re-mount it (new `key`) after a failed attempt; if mounted
 * with an `error` it shakes once.
 */
export const PinPad = memo(function PinPad({ title, hint, error, busy, disabled, aux, onComplete }: Props) {
  const [pin, setPin] = useState("");
  const shake = !!error;

  useEffect(() => {
    if (error) try { navigator.vibrate?.(60); } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const press = useCallback((d: string) => {
    if (busy || disabled) return;
    setPin((p) => {
      if (p.length >= PIN_LENGTH) return p;
      const next = p + d;
      if (next.length === PIN_LENGTH) setTimeout(() => onComplete(next), 120); // let the last dot fill first
      return next;
    });
  }, [busy, disabled, onComplete]);
  const back = useCallback(() => setPin((p) => p.slice(0, -1)), []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") back();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [press, back]);

  return (
    <div className="flex flex-col items-center">
      <p className="text-headline font-semibold">{title}</p>
      <div className="mt-1 min-h-5 text-center text-footnote text-ink-2" aria-live="polite">{error ? <span className="text-critical">{error}</span> : hint}</div>

      <div className={`mt-6 flex gap-4 ${shake ? "animate-[cc-shake_420ms_var(--ease-out)]" : ""}`} aria-label={`${pin.length} of ${PIN_LENGTH} digits entered`} role="status">
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <i
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-[1.5px] transition-[background-color,transform] duration-150 ease-spring ${
              i < pin.length ? "scale-110 border-ink bg-ink" : "border-ink-3 bg-transparent"
            } ${busy ? "animate-pulse" : ""}`}
          />
        ))}
      </div>

      <div className={`mt-9 grid grid-cols-3 gap-x-6 gap-y-4 transition-opacity ${disabled ? "pointer-events-none opacity-40" : ""}`}>
        {KEYS.map((d) => <Key key={d} onPress={() => press(d)}>{d}</Key>)}
        <div className="grid h-[72px] w-[72px] place-items-center">{aux}</div>
        <Key onPress={() => press("0")}>0</Key>
        <button onClick={back} aria-label="Delete" className="grid h-[72px] w-[72px] place-items-center rounded-full text-ink-2 transition-transform duration-100 ease-spring active:scale-90">
          <Delete size={24} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
});

function Key({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPress(); } }}
      className="glass tnum grid h-[72px] w-[72px] place-items-center !rounded-full text-[28px] font-normal leading-none transition-[transform,background-color] duration-100 ease-spring active:scale-90 active:bg-[var(--surface)]"
    >
      {children}
    </button>
  );
}
