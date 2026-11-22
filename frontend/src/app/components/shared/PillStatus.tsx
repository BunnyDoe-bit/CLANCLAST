import type { ReactNode } from "react";

/**
 * Small status pill used in the header/hero of both the app shells and the
 * marketing landing page. Extracted verbatim from the original inline
 * definition in App.tsx (same tokens/tones) so it can be shared.
 */
export function PillStatus({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "amber" | "red" | "gray" }) {
  const t = {
    green: "bg-[#dff4e9] text-[#166044]",
    amber: "bg-[#fff0d1] text-[#996415]",
    red: "bg-[#fee2e2] text-[#a52c31]",
    gray: "bg-[#edf1ef] text-[#5b6863]",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${t}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
