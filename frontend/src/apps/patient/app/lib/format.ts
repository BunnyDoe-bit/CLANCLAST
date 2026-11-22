/** Shared, locale-aware formatting. South African English; all numbers render with tabular figures via `.tnum`. */
const dateFmt = new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const fmtDate = (d: string | number | Date) => dateFmt.format(new Date(d));
export const fmtDateTime = (d: string | number | Date) => dateTimeFmt.format(new Date(d));

/** "just now", "12 min ago", "3 h ago", "4 days ago" */
export function ago(t: string | number | Date) {
  const s = Math.max(0, Math.round((Date.now() - new Date(t).getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 60) return `${d} days ago`;
  const mo = Math.round(d / 30.4);
  if (mo < 18) return `${mo} months ago`;
  return `${Math.round(d / 365)} years ago`;
}

/** "in 42 min", "in 5 h", "in 6 days" — for expiries. */
export function until(t: string | number | Date) {
  const s = Math.round((new Date(t).getTime() - Date.now()) / 1000);
  if (s <= 0) return "now";
  const m = Math.round(s / 60);
  if (m < 60) return `in ${Math.max(1, m)} min`;
  const h = Math.round(m / 60);
  if (h < 36) return `in ${h} h`;
  return `in ${Math.round(h / 24)} days`;
}
