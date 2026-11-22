import type { ReactNode } from "react";

/** Small status pill. Tones use the CLANCLAST status tokens, so they follow light and dark themes. */
export function PillStatus({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "amber" | "red" | "gray" }) {
  const t = {
    green: "bg-accent text-accent-foreground",
    amber: "bg-warning-tint text-warning",
    red: "bg-critical-tint text-critical",
    gray: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${t}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
