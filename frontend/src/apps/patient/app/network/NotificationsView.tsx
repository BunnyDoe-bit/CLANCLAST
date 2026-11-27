import { useMemo } from "react";
import { AlertTriangle, Bell, CheckCheck, Handshake, Info } from "lucide-react";
import { patientApi } from "../../lib/api";
import { navigate, type View } from "../lib/router";
import { ago } from "../lib/format";

export type Notice = { id: string; category: "ACTION_REQUIRED" | "IMPORTANT" | "INFORMATIONAL" | string; title: string; body: string; read: boolean; createdAt: string };

const CAT: Record<string, { label: string; tone: string; Icon: typeof Bell }> = {
  ACTION_REQUIRED: { label: "Action required", tone: "bg-warning-tint text-warning", Icon: Handshake },
  IMPORTANT: { label: "Important", tone: "bg-critical-tint text-critical", Icon: AlertTriangle },
  INFORMATIONAL: { label: "Update", tone: "bg-accent-tint text-accent", Icon: Info },
};

/** Where a notice should take the patient, from its wording. */
function destination(n: Notice): View | null {
  const t = `${n.title} ${n.body}`.toLowerCase();
  if (/access|consent|request|grant|revok/.test(t)) return "consent";
  if (/summar|vault/.test(t)) return "vault";
  if (/connect|team|provider/.test(t)) return "team";
  return null;
}

export default function NotificationsView({ items, setItems }: { items: Notice[]; setItems: (fn: (n: Notice[]) => Notice[]) => void }) {
  const unread = items.filter((n) => !n.read).length;
  const groups = useMemo(() => {
    const today = new Date().toDateString();
    const t = items.filter((n) => new Date(n.createdAt).toDateString() === today);
    const e = items.filter((n) => new Date(n.createdAt).toDateString() !== today);
    return [["Today", t], ["Earlier", e]].filter(([, l]) => (l as Notice[]).length) as [string, Notice[]][];
  }, [items]);

  // Optimistic: the dot clears instantly; a failed call restores it.
  function markRead(ids: string[]) {
    if (!ids.length) return;
    setItems((l) => l.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    Promise.allSettled(ids.map((id) => patientApi.markNotificationRead(id))).then((res) => {
      const failed = ids.filter((_, i) => res[i].status === "rejected");
      if (failed.length) setItems((l) => l.map((n) => (failed.includes(n.id) ? { ...n, read: false } : n)));
    });
  }

  return (
    <>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="large-title">Notifications</h1>
          <p className="tnum mt-1 text-subhead text-ink-2">{unread ? `${unread} unread` : "You're all caught up"}</p>
        </div>
        {unread > 0 && (
          <button onClick={() => markRead(items.filter((n) => !n.read).map((n) => n.id))} className="glass-float press inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-footnote font-semibold">
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="glass flex items-center gap-3.5 p-5 text-footnote text-ink-2"><Bell size={20} className="text-ink-3" /> Nothing yet. Requests and important changes will appear here.</div>
      ) : groups.map(([label, list]) => (
        <section key={label} className="mt-5 first:mt-0">
          <h2 className="mb-2 px-1 text-footnote font-semibold uppercase tracking-[0.06em] text-ink-2">{label}</h2>
          <ul className="list-group">
            {list.map((n) => {
              const c = CAT[n.category] ?? CAT.INFORMATIONAL;
              const to = destination(n);
              return (
                <li key={n.id}>
                  <button
                    onClick={() => { markRead([n.id]); if (to) navigate(to); }}
                    className="list-row items-start py-3.5"
                  >
                    <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[12px] ${c.tone}`}><c.Icon size={17} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={`min-w-0 flex-1 text-callout ${n.read ? "font-medium text-ink-2" : "font-semibold"}`}>{n.title}</span>
                        {!n.read && <i aria-label="Unread" className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
                      </span>
                      <span className="mt-0.5 block text-footnote text-ink-2">{n.body}</span>
                      <span className="tnum mt-1 block text-caption text-ink-3">{c.label} · {ago(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
