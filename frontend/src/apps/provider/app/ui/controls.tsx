import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";

/** iOS-style switch. 51×31, spring thumb. */
export function Toggle({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${on ? "bg-accent" : "bg-surface-3"}`}
    >
      <i className={`absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.18)] transition-transform duration-300 ease-spring ${on ? "translate-x-[20px]" : ""}`} />
    </button>
  );
}

/** Segmented control with a spring-sliding thumb. */
export function Segmented<T extends string>({ value, options, onChange, label, size = "md" }: {
  value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; label: string; size?: "sm" | "md";
}) {
  const idx = Math.max(0, options.findIndex((o) => o.v === value));
  const n = options.length;
  return (
    <div role="radiogroup" aria-label={label} className="relative grid rounded-[12px] bg-surface-2 p-0.5" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      <i
        aria-hidden="true"
        className="absolute bottom-0.5 left-0.5 top-0.5 rounded-[10px] bg-[var(--surface)] shadow-[0_1px_2px_rgb(7_43_39/0.08),0_4px_10px_-6px_rgb(7_43_39/0.2)] transition-transform duration-500 ease-spring"
        style={{ width: `calc((100% - 4px) / ${n})`, transform: `translateX(${idx * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.v} role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)}
          className={`relative z-10 rounded-[10px] px-2 font-semibold transition-colors duration-200 ${size === "sm" ? "h-8 text-caption" : "h-9 text-footnote"} ${value === o.v ? "text-ink" : "text-ink-2"}`}
        >{o.label}</button>
      ))}
    </div>
  );
}

/** One row in a grouped list. Becomes a button (with chevron) when onClick is given. */
export function SettingRow({ Icon, title, detail, value, onClick, trailing, tone }: {
  Icon?: LucideIcon; title: ReactNode; detail?: ReactNode; value?: ReactNode; onClick?: () => void; trailing?: ReactNode; tone?: "critical";
}) {
  const body = (
    <>
      {Icon && (
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] ${tone === "critical" ? "bg-critical-tint text-critical" : "bg-accent-tint text-accent"}`}>
          <Icon size={17} strokeWidth={1.9} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={`block text-callout font-medium ${tone === "critical" ? "text-critical" : ""}`}>{title}</span>
        {detail && <span className="block text-footnote text-ink-2">{detail}</span>}
      </span>
      {value !== undefined && <span className="tnum shrink-0 text-callout text-ink-2">{value}</span>}
      {trailing}
      {onClick && !trailing && <ChevronRight size={18} className="shrink-0 text-ink-3" />}
    </>
  );
  return onClick ? <button onClick={onClick} className="list-row">{body}</button> : <div className="list-row">{body}</div>;
}

export function Group({ title, footer, children }: { title?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      {title && <h2 className="mb-2 px-1 text-footnote font-semibold uppercase tracking-[0.06em] text-ink-2">{title}</h2>}
      <div className="list-group">{children}</div>
      {footer && <p className="mt-2 px-1 text-footnote text-ink-2">{footer}</p>}
    </section>
  );
}

export function TextField({ label, value, onChange, type = "text", inputMode, autoComplete, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; inputMode?: "text" | "numeric" | "tel" | "email"; autoComplete?: string; placeholder?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input className="input" type={type} inputMode={inputMode} autoComplete={autoComplete} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
