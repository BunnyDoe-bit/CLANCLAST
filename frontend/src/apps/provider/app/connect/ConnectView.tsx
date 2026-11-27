import { useCallback, useEffect, useState } from "react";
import { ArrowLeftRight, Building2, Check, Copy, Plus, RefreshCw, Search, Server, Trash2, X } from "lucide-react";
import { ApiError, connectApi, FHIR_BASE, providerApi, type ConnectState, type Directory, type Endpoint } from "../../lib/api";
import { ago } from "../lib/format";
import { Segmented, TextField } from "../ui/controls";
import { Sheet } from "../ui/Sheet";

/**
 * CLANCLAST Connect (Blueprint §13.2, §13.3.7): how your systems reach
 * CLANCLAST and how other institutions reach you. Pointers and health only,
 * never record copies. Health checks are real FHIR calls.
 */
const STATUS: Record<string, { label: string; dot: string; tone: string }> = {
  UP: { label: "Up", dot: "bg-positive", tone: "text-positive" },
  DEGRADED: { label: "Slow", dot: "bg-warning", tone: "text-warning" },
  DOWN: { label: "Down", dot: "bg-critical", tone: "text-critical" },
  UNKNOWN: { label: "Not checked", dot: "bg-ink-3", tone: "text-ink-2" },
};

let cache: { s: ConnectState; d: Directory } | null = null;

export default function ConnectView() {
  const [s, setS] = useState<ConnectState | null>(cache?.s ?? null);
  const [dir, setDir] = useState<Directory | null>(cache?.d ?? null);
  const [adding, setAdding] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([connectApi.state(), connectApi.directory()]);
      cache = { s: a, d: b }; setS(a); setDir(b);
    } catch (e) { setError(e instanceof ApiError ? e.message : "Couldn’t load Connect."); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const primary = s?.endpoints.filter((e) => e.role === "PRIMARY") ?? [];
  const replica = s?.endpoints.filter((e) => e.role === "REPLICA") ?? [];
  const failover = primary.length > 0 && primary.every((e) => e.status === "DOWN") && replica.some((e) => e.status === "UP");

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="large-title">Connect</h1>
          <p className="mt-1 text-subhead text-ink-2">How your systems reach CLANCLAST, and how other institutions reach you. Pointers and health only, never record copies.</p>
        </div>
        <button onClick={() => setAdding(true)} className="btn btn-primary"><Plus size={16} /> Add endpoint</button>
      </div>
      {error && <p role="alert" className="mb-3 rounded-[14px] bg-critical-tint px-3.5 py-2.5 text-footnote text-critical">{error}</p>}

      <div className="grid items-start gap-3 @5xl/app:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="glass min-w-0 p-5">
          <h2 className="text-headline font-semibold">Your systems</h2>
          <p className="mt-0.5 text-footnote text-ink-2">Where {s?.organization.name ?? "your institution"}’s own records can be reached. Checked every 10 minutes with a FHIR <span className="mono">/metadata</span> call.</p>
          {failover && <p className="mt-3 rounded-[14px] bg-warning-tint px-3.5 py-2.5 text-footnote text-warning"><b className="font-semibold">Primary is down.</b> Requests route to your replica, read-only, until it recovers (Blueprint failover).</p>}
          {!s ? <div className="skeleton mt-4 h-24 !rounded-[14px]" /> : s.endpoints.length === 0 ? (
            <div className="mt-4 rounded-[16px] border border-dashed border-[var(--hairline-strong)] p-6 text-center">
              <Server size={22} className="mx-auto text-ink-3" />
              <p className="mt-2 text-callout font-semibold">No endpoints yet</p>
              <p className="mx-auto mt-1 max-w-[44ch] text-footnote text-ink-2">Add your EHR or patient administration system’s FHIR base URL, and a replica if you run one, so CLANCLAST can route consented requests and fail over when you’re down.</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">{s.endpoints.map((e) => <EndpointRow key={e.id} e={e} onChange={(n) => setS((x) => x && { ...x, endpoints: n ? x.endpoints.map((y) => (y.id === n.id ? n : y)) : x.endpoints.filter((y) => y.id !== e.id) })} />)}</ul>
          )}
        </section>

        <FhirCard />
      </div>

      <Institutions dir={dir} state={s} onInvite={() => setInviting(true)} reload={load} />

      {adding && <AddEndpoint close={() => setAdding(false)} added={(e) => { setS((x) => x && { ...x, endpoints: [...x.endpoints, e] }); setAdding(false); }} />}
      {inviting && dir && <Invite dir={dir} close={() => setInviting(false)} done={() => { setInviting(false); load(); }} />}
    </>
  );
}

function EndpointRow({ e, onChange }: { e: Endpoint; onChange: (e: Endpoint | null) => void }) {
  const [busy, setBusy] = useState(false);
  const st = STATUS[e.status] ?? STATUS.UNKNOWN;
  return (
    <li className="rounded-[16px] bg-[var(--surface)] p-3.5 shadow-[0_1px_2px_rgb(7_43_39/0.05)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="relative flex h-2.5 w-2.5 shrink-0">{e.status === "UP" && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-40" />}<span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${st.dot}`} /></span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2"><span className="truncate text-subhead font-semibold">{e.label}</span><span className="badge h-5 bg-surface-2 px-1.5 text-micro text-ink-2">{e.role === "PRIMARY" ? "Primary" : "Replica"}</span></span>
          <span className="mono block truncate text-caption text-ink-2">{e.baseUrl}</span>
        </span>
        <span className="tnum text-right text-caption">
          <span className={`block font-semibold ${st.tone}`}>{st.label}{e.lastLatencyMs != null && e.status !== "DOWN" ? ` · ${e.lastLatencyMs} ms` : ""}</span>
          <span className="block text-ink-3">{e.fhirVersion ? `FHIR ${e.fhirVersion} · ` : ""}{e.lastCheckedAt ? ago(e.lastCheckedAt) : "never"}</span>
        </span>
        <span className="flex">
          <button onClick={async () => { setBusy(true); try { onChange(await connectApi.check(e.id)); } finally { setBusy(false); } }} aria-label={`Check ${e.label} now`} className="grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-[var(--glass)]"><RefreshCw size={15} className={busy ? "animate-spin" : ""} /></button>
          <button onClick={async () => { await connectApi.remove(e.id); onChange(null); }} aria-label={`Remove ${e.label}`} className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-critical-tint hover:text-critical"><Trash2 size={15} /></button>
        </span>
      </div>
      {e.lastError && e.status !== "UP" && <p className="mt-2 text-caption text-ink-2">{e.lastError}</p>}
    </li>
  );
}

function AddEndpoint({ close, added }: { close: () => void; added: (e: Endpoint) => void }) {
  const [f, setF] = useState({ label: "", baseUrl: "", role: "PRIMARY" as "PRIMARY" | "REPLICA" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { added(await connectApi.add(f)); } catch (err) { setError(err instanceof ApiError ? (err.details ? "Check the name and URL." : err.message) : "Couldn’t reach CLANCLAST."); setBusy(false); }
  }
  return (
    <Sheet title="Add an endpoint" close={close}>
      <form onSubmit={go} className="space-y-4">
        <TextField label="Name" placeholder="e.g. Patient administration (FHIR)" value={f.label} onChange={(v) => setF((x) => ({ ...x, label: v }))} />
        <TextField label="FHIR base URL" placeholder="https://fhir.your-hospital.co.za/r4" value={f.baseUrl} onChange={(v) => setF((x) => ({ ...x, baseUrl: v }))} />
        <Segmented label="Role" value={f.role} onChange={(role) => setF((x) => ({ ...x, role }))} options={[{ v: "PRIMARY", label: "Primary" }, { v: "REPLICA", label: "Replica (read-only)" }]} />
        <p className="text-caption text-ink-3">Public https addresses only. It’s checked straight away.</p>
        {error && <p role="alert" className="text-footnote text-critical">{error}</p>}
        <button type="submit" disabled={busy || f.label.trim().length < 2 || !f.baseUrl.trim()} className="btn btn-primary btn-block">{busy ? "Checking…" : "Add and check"}</button>
      </form>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- CLANCLAST's FHIR API */

function FhirCard() {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Awaited<ReturnType<typeof connectApi.match>> | null>(null);
  const [copied, setCopied] = useState(false);
  const example = `curl -X POST ${FHIR_BASE}/Patient/\\$match \\\n  -H "Authorization: Bearer <token>" \\\n  -H "Content-Type: application/fhir+json" \\\n  -d '{"resourceType":"Parameters","parameter":[{"name":"resource","resource":{"resourceType":"Patient","name":[{"text":"Thandi Mokoena"}],"birthDate":"1988-04-12"}}]}'`;
  return (
    <section className="glass min-w-0 p-5">
      <div className="flex items-center gap-2"><ArrowLeftRight size={18} className="text-accent" /><h2 className="text-headline font-semibold">CLANCLAST’s FHIR API</h2></div>
      <p className="mt-0.5 text-footnote text-ink-2">Your EHR can resolve identity without custom code. HL7 FHIR R4, identity only.</p>
      <ul className="mt-3 space-y-1 text-caption">
        {[["GET", "/metadata", "Capabilities (public)"], ["GET", "/Patient/{id}", "A patient in your care"], ["GET", "/Patient?identifier=…", "Search by CLANCLAST ID"], ["POST", "/Patient/$match", "Already registered?"]].map(([m, p, d]) => (
          <li key={p} className="flex items-center gap-2"><span className="w-10 shrink-0 font-semibold text-accent">{m}</span><span className="mono min-w-0 flex-1 truncate">{p}</span><span className="hidden text-ink-3 @xl/app:inline">{d}</span></li>
        ))}
      </ul>
      <div className="mt-3 overflow-hidden rounded-[12px] bg-ink">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
          <span className="text-caption font-semibold text-white/60">Example · $match</span>
          <button onClick={async () => { try { await navigator.clipboard.writeText(example.replace(/\\\$/g, "$")); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } }} className="flex items-center gap-1 text-caption font-semibold text-white/80">{copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}</button>
        </div>
        <pre className="mono no-scrollbar overflow-x-auto p-3 text-[11px] leading-relaxed text-[var(--canvas-base)]">{example}</pre>
      </div>
      <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { setRes(await connectApi.match({ name, birthDate: dob || undefined })); } finally { setBusy(false); } }} className="mt-4 border-t border-hairline pt-4">
        <p className="mb-2 text-footnote font-semibold">Try <span className="mono">$match</span></p>
        <div className="grid grid-cols-[1fr_auto] gap-2 @xl/app:grid-cols-[1fr_150px_auto]">
          <input className="input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Full name" />
          <input className="input hidden @xl/app:block" type="date" value={dob} onChange={(e) => setDob(e.target.value)} aria-label="Date of birth" />
          <button disabled={busy || name.trim().length < 2} className="btn btn-quiet"><Search size={16} /></button>
        </div>
        {res && (
          <ul className="mt-3 space-y-1">
            {res.entry.length === 0 ? <li className="text-footnote text-ink-2">No candidates.</li> : res.entry.map((e) => (
              <li key={e.resource.id} className="flex items-center gap-2 text-footnote">
                <span className="min-w-0 flex-1 truncate">{e.resource.name[0].text} <span className="mono text-ink-3">{e.resource.id}</span></span>
                <span className="badge h-5 bg-surface-2 px-1.5 text-micro text-ink-2">{e.search.extension[0].valueCode}</span>
                <span className="tnum w-10 text-right text-ink-2">{Math.round(e.search.score * 100)}%</span>
              </li>
            ))}
          </ul>
        )}
      </form>
    </section>
  );
}

/* ---------------------------------------------------------------- institutions */

function Institutions({ dir, state, onInvite, reload }: { dir: Directory | null; state: ConnectState | null; onInvite: () => void; reload: () => void }) {
  const pending = dir?.incoming.filter((c) => c.status === "PENDING") ?? [];
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-end justify-between gap-3 px-1">
        <h2 className="text-headline font-semibold">Connected institutions</h2>
        <button onClick={onInvite} className="text-footnote font-semibold text-accent">Connect an institution</button>
      </div>
      {pending.length > 0 && (
        <ul className="mb-3 space-y-2">
          {pending.map((c) => (
            <li key={c.id} className="glass flex flex-wrap items-center gap-3 p-4 ring-1 ring-[var(--accent)]">
              <Building2 size={18} className="text-accent" />
              <span className="min-w-0 flex-1 text-subhead"><b className="font-semibold">{c.organization}</b> wants to connect{c.message ? ` · “${c.message}”` : ""}<span className="block text-caption text-ink-2">Requested by {c.requestedBy} · {ago(c.createdAt)}</span></span>
              <button onClick={async () => { await providerApi.declineConnection(c.id); reload(); }} className="btn btn-quiet h-9">Decline</button>
              <button onClick={async () => { await providerApi.acceptConnection(c.id); reload(); }} className="btn btn-primary h-9">Accept</button>
            </li>
          ))}
        </ul>
      )}
      {!state ? <div className="skeleton h-24 !rounded-[var(--radius-card)]" /> : state.partners.length === 0 ? (
        <p className="glass p-5 text-footnote text-ink-2">No connected institutions yet. Connecting lets referrals and consented requests route between you.</p>
      ) : (
        <ul className="grid gap-3 @4xl/app:grid-cols-2">
          {state.partners.map((o) => {
            const up = o.endpoints.filter((e) => e.status === "UP").length;
            return (
              <li key={o.id} className="glass flex items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-accent-tint text-accent"><Building2 size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-subhead font-semibold">{o.name}</span>
                  <span className="block text-caption text-ink-2">{o.type.charAt(0) + o.type.slice(1).toLowerCase()} · {o.endpoints.length ? `${up} of ${o.endpoints.length} endpoints up` : "no endpoints registered"}</span>
                </span>
                {o.endpoints.map((e, i) => <i key={i} title={`${e.role.toLowerCase()} · ${e.status.toLowerCase()}`} className={`h-2.5 w-2.5 rounded-full ${(STATUS[e.status] ?? STATUS.UNKNOWN).dot}`} />)}
              </li>
            );
          })}
        </ul>
      )}
      {dir && dir.outgoing.some((c) => c.status === "PENDING") && <p className="mt-2 px-1 text-caption text-ink-3">Waiting on: {dir.outgoing.filter((c) => c.status === "PENDING").map((c) => c.organization).join(", ")}</p>}
    </section>
  );
}

function Invite({ dir, close, done }: { dir: Directory; close: () => void; done: () => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const taken = new Set([...dir.outgoing.filter((c) => c.status !== "DECLINED").map((c) => c.organization), ...dir.incoming.filter((c) => c.status !== "DECLINED").map((c) => c.organization)]);
  const list = dir.organizations.filter((o) => !o.isOwnOrganization && o.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Sheet title="Connect an institution" close={close}>
      <label className="relative block"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" /><input autoFocus className="input pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search institutions" aria-label="Search institutions" /></label>
      {error && <p className="mt-2 text-footnote text-critical">{error}</p>}
      <ul className="-mx-2 mt-3 max-h-[50vh] overflow-y-auto">
        {list.map((o) => (
          <li key={o.id} className="flex items-center gap-3 rounded-[12px] px-2 py-2">
            <span className="min-w-0 flex-1"><span className="block truncate text-subhead font-semibold">{o.name}</span><span className="block text-caption text-ink-2">{o.type.charAt(0) + o.type.slice(1).toLowerCase()}</span></span>
            {taken.has(o.name) ? <span className="text-caption text-ink-3">Requested</span> : (
              <button onClick={async () => { setBusy(o.id); setError(""); try { await providerApi.inviteConnection({ toOrganizationId: o.id }); done(); } catch (e) { setError(e instanceof ApiError ? e.message : "Couldn’t send."); setBusy(null); } }} disabled={!!busy} className="btn btn-quiet h-9">{busy === o.id ? "Sending…" : "Request"}</button>
            )}
          </li>
        ))}
      </ul>
      <button onClick={close} className="btn btn-quiet btn-block mt-3"><X size={16} /> Close</button>
    </Sheet>
  );
}
