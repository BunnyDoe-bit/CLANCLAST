import { useEffect, useState } from "react";
import {
  Bell, ChevronLeft, Clock, LifeBuoy, Globe, History, KeyRound, Languages, LockKeyhole, LogOut, MonitorSmartphone, Palette, Plus, Trash2, Type, UserRound, Users, UsersRound,
} from "lucide-react";
import { ApiError, patientApi } from "../../lib/api";
import { navigate, type View } from "../lib/router";
import { setPrefs, usePrefs, type Theme } from "../lib/preferences";
import { Sheet } from "../ui/Sheet";
import { Group, Segmented, SettingRow, TextField, Toggle } from "../ui/controls";
import { openSupport, supportEnabled } from "../support/Support";

/**
 * Account — one grouped settings page (iOS Settings pattern) plus two drill-ins:
 * Personal details and Caregivers. Every change is optimistic and rolls back on failure.
 */

export type Settings = {
  fullName: string; humanetId: string; email?: string | null;
  emergencyContactName?: string | null; emergencyContactRelationship?: string | null;
  language: string; largeText: boolean; defaultConsentDuration?: "ONCE" | "SEVEN_DAYS" | "UNTIL_REVOKED" | null;
  notifyActionRequired: boolean; notifyImportant: boolean; notifyInformational: boolean;
};

type Props = {
  view: View;
  settings: Settings | null;
  setSettings: (fn: (s: Settings | null) => Settings | null) => void;
  teamCount: number;
  onSignOut: () => void;
};

const LANGUAGES = ["English", "Afrikaans", "isiZulu", "isiXhosa", "Sesotho", "Setswana", "Sepedi"];

export default function AccountView({ view, settings, setSettings, teamCount, onSignOut }: Props) {
  const [error, setError] = useState("");

  /** Optimistic save with rollback. */
  async function save(patch: Partial<Settings>) {
    if (!settings) return;
    const before = settings;
    setError("");
    setSettings((s) => (s ? { ...s, ...patch } : s));
    try { await patientApi.updateProfile(patch); }
    catch (e) { setSettings(() => before); setError(e instanceof ApiError ? e.message : "Couldn't save that change. Try again."); }
  }

  if (view === "profile-personal") return <Personal settings={settings} save={save} error={error} />;
  if (view === "profile-caregivers") return <Caregivers />;
  return <Overview settings={settings} save={save} error={error} teamCount={teamCount} onSignOut={onSignOut} />;
}

/* ------------------------------------------------------------------ overview */

const THEMES: { v: Theme; label: string }[] = [{ v: "system", label: "Auto" }, { v: "light", label: "Light" }, { v: "dark", label: "Dark" }];
const DURATIONS = [{ v: "ONCE", label: "Once" }, { v: "SEVEN_DAYS", label: "7 days" }, { v: "UNTIL_REVOKED", label: "Until revoked" }] as const;

function Overview({ settings, save, error, teamCount, onSignOut }: { settings: Settings | null; save: (p: Partial<Settings>) => void; error: string; teamCount: number; onSignOut: () => void }) {
  const prefs = usePrefs();
  const [langOpen, setLangOpen] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const s = settings;

  return (
    <>
      <h1 className="large-title mb-5">Account</h1>

      {/* Profile header */}
      <section className="glass flex items-center gap-4 p-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ink text-headline font-semibold text-[var(--canvas-base)]">
          {s ? s.fullName.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() : ""}
        </span>
        <div className="min-w-0 flex-1">
          {s ? <>
            <p className="truncate text-headline font-semibold">{s.fullName}</p>
            <p className="mono truncate text-footnote text-ink-2">{s.humanetId}</p>
            {s.email && <p className="truncate text-footnote text-ink-2">{s.email}</p>}
          </> : <><span className="skeleton block h-5 w-40" /><span className="skeleton mt-1.5 block h-4 w-28" /></>}
        </div>
      </section>

      {error && <p role="alert" className="enter mt-3 rounded-[14px] bg-critical-tint px-3.5 py-2.5 text-footnote text-critical">{error}</p>}

      <Group title="Sharing" footer="New access requests start on this choice. You can change it each time.">
        <div className="list-row flex-wrap">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-accent-tint text-accent"><Clock size={17} strokeWidth={1.9} /></span>
          <span className="flex-1 text-callout font-medium">Default access length</span>
          <div className="w-full @md/app:w-[300px]">
            <Segmented label="Default access length" size="sm" value={s?.defaultConsentDuration ?? "SEVEN_DAYS"} options={[...DURATIONS]} onChange={(v) => save({ defaultConsentDuration: v })} />
          </div>
        </div>
        <SettingRow Icon={Users} title="Care team" value={teamCount || undefined} onClick={() => navigate("team")} />
        <SettingRow Icon={UsersRound} title="Caregivers" detail="People who can help manage your consent" onClick={() => navigate("profile-caregivers")} />
        <SettingRow Icon={UserRound} title="Personal details" detail="Email and emergency contact" onClick={() => navigate("profile-personal")} />
      </Group>

      <Group title="Security">
        <SettingRow Icon={LockKeyhole} title="Vault" detail="PIN, Face ID and erase" onClick={() => navigate("vault")} />
        <SettingRow Icon={History} title="Access log" detail="Who viewed your information" onClick={() => navigate("profile-access-log")} />
      </Group>

      <Group title="Appearance">
        <div className="list-row flex-wrap">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-accent-tint text-accent"><Palette size={17} strokeWidth={1.9} /></span>
          <span className="flex-1 text-callout font-medium">Theme</span>
          <div className="w-[220px]"><Segmented label="Theme" size="sm" value={prefs.theme} options={THEMES} onChange={(t) => setPrefs({ theme: t })} /></div>
        </div>
        <SettingRow Icon={Type} title="Larger text" detail="Increases text size across the app"
          trailing={<Toggle label="Larger text" on={!!s?.largeText} disabled={!s} onChange={(v) => save({ largeText: v })} />} />
        <SettingRow Icon={Languages} title="Language" value={s?.language ?? "—"} onClick={() => setLangOpen(true)} />
        <div className="hidden @3xl/app:block">
          <SettingRow Icon={MonitorSmartphone} title="Presentation mode" detail="Show the app inside a phone frame for demos"
            trailing={<Toggle label="Presentation mode" on={prefs.present} onChange={(v) => setPrefs({ present: v })} />} />
        </div>
      </Group>

      <Group title="Notifications">
        <SettingRow Icon={Bell} title="Action required" detail="Access requests and things only you can decide"
          trailing={<Toggle label="Action required" on={!!s?.notifyActionRequired} disabled={!s} onChange={(v) => save({ notifyActionRequired: v })} />} />
        <SettingRow Icon={KeyRound} title="Important" detail="Emergency access, revocations, expiring summaries"
          trailing={<Toggle label="Important" on={!!s?.notifyImportant} disabled={!s} onChange={(v) => save({ notifyImportant: v })} />} />
        <SettingRow Icon={Globe} title="Informational" detail="Connections and routine updates"
          trailing={<Toggle label="Informational" on={!!s?.notifyInformational} disabled={!s} onChange={(v) => save({ notifyInformational: v })} />} />
      </Group>

      {supportEnabled && (
        <Group title="Help">
          <SettingRow Icon={LifeBuoy} title="Get help or report a problem" detail="We reply by email" onClick={openSupport} />
        </Group>
      )}

      <Group>
        {confirmOut ? (
          <div className="p-4">
            <p className="text-footnote text-ink-2">Sign out of this device? Your vault stays encrypted here and locks immediately.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setConfirmOut(false)} className="btn btn-quiet">Cancel</button>
              <button onClick={onSignOut} className="btn bg-critical text-white">Sign out</button>
            </div>
          </div>
        ) : (
          <SettingRow Icon={LogOut} title="Sign out" tone="critical" onClick={() => setConfirmOut(true)} trailing={<span />} />
        )}
      </Group>

      <p className="mt-6 px-1 text-center text-caption text-ink-3">CLANCLAST never stores your clinical records and never sells identifiable data.</p>

      {langOpen && (
        <Sheet title="Language" close={() => setLangOpen(false)}>
          <div className="list-group">
            {LANGUAGES.map((l) => (
              <button key={l} onClick={() => { save({ language: l }); setLangOpen(false); }} className="list-row">
                <span className="flex-1 text-callout">{l}</span>
                {s?.language === l && <span className="text-callout font-semibold text-accent">✓</span>}
              </button>
            ))}
          </div>
          <p className="mt-3 text-footnote text-ink-2">Used for messages, USSD and SMS. Screens in other languages are on the way.</p>
        </Sheet>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ drill-ins */

function Back({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-5">
      <button onClick={() => navigate("profile")} className="btn btn-plain -ml-2 mb-1 min-h-9 px-2 text-callout"><ChevronLeft size={20} /> Account</button>
      <h1 className="large-title">{title}</h1>
      <p className="mt-1 text-subhead text-ink-2">{sub}</p>
    </div>
  );
}

function Personal({ settings, save, error }: { settings: Settings | null; save: (p: Partial<Settings>) => void; error: string }) {
  const [form, setForm] = useState({ email: "", emergencyContactName: "", emergencyContactRelationship: "" });
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (settings) setForm({ email: settings.email ?? "", emergencyContactName: settings.emergencyContactName ?? "", emergencyContactRelationship: settings.emergencyContactRelationship ?? "" });
  }, [settings?.humanetId]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = !!settings && (form.email !== (settings.email ?? "") || form.emergencyContactName !== (settings.emergencyContactName ?? "") || form.emergencyContactRelationship !== (settings.emergencyContactRelationship ?? ""));

  return (
    <>
      <Back title="Personal details" sub="Contact details only. Clinical information comes from your clinics as signed summaries." />
      <form className="glass space-y-4 p-5" onSubmit={(e) => {
        e.preventDefault();
        const { email, ...rest } = form;
        save(email.trim() ? { ...rest, email: email.trim() } : rest); // the API requires a valid address when one is given
        setSaved(true); setTimeout(() => setSaved(false), 1800);
      }}>
        <TextField label="Email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
        <TextField label="Emergency contact" autoComplete="off" value={form.emergencyContactName} onChange={(v) => setForm((f) => ({ ...f, emergencyContactName: v }))} />
        <TextField label="Relationship" value={form.emergencyContactRelationship} onChange={(v) => setForm((f) => ({ ...f, emergencyContactRelationship: v }))} />
        {error && <p role="alert" className="rounded-[14px] bg-critical-tint px-3.5 py-2.5 text-footnote text-critical">{error}</p>}
        <button type="submit" disabled={!dirty} className="btn btn-primary btn-lg btn-block">{saved ? "Saved" : "Save changes"}</button>
      </form>
      <p className="mt-3 px-1 text-footnote text-ink-2">Allergies, medication and blood group are no longer edited here. They come from your clinic in a signed emergency summary, so a clinician can trust them.</p>
    </>
  );
}

type Caregiver = { id: string; name: string; relationship: string; phone?: string | null; canSignIn?: boolean };

function Caregivers() {
  const [list, setList] = useState<Caregiver[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { patientApi.caregivers().then(setList).catch(() => setList([])); }, []);

  async function remove(c: Caregiver) {
    const before = list;
    setList((l) => l?.filter((x) => x.id !== c.id) ?? l);
    try { await patientApi.removeCaregiver(c.id); } catch { setList(before); setError("Couldn't remove that caregiver."); }
  }

  return (
    <>
      <Back title="Caregivers" sub="People you trust to approve or decline requests for you." />
      {error && <p role="alert" className="mb-3 rounded-[14px] bg-critical-tint px-3.5 py-2.5 text-footnote text-critical">{error}</p>}
      {list === null ? (
        <div className="list-group">{[0, 1].map((i) => <div key={i} className="list-row"><span className="skeleton h-10 w-10 !rounded-full" /><span className="flex-1"><span className="skeleton block h-4 w-32" /><span className="skeleton mt-1.5 block h-3 w-44" /></span></div>)}</div>
      ) : list.length === 0 ? (
        <div className="glass p-4 text-footnote text-ink-2">No caregivers yet.</div>
      ) : (
        <div className="list-group">
          {list.map((c) => (
            <div key={c.id} className="list-row">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-tint text-footnote font-semibold text-accent">{c.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("")}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-callout font-medium">{c.name}</span>
                <span className="tnum block text-footnote text-ink-2">{c.relationship}{c.phone ? ` · ${c.phone}` : ""}</span>
                {c.canSignIn && <span className="mt-0.5 block text-caption font-semibold text-accent">Can sign in for you</span>}
              </span>
              <button onClick={() => remove(c)} aria-label={`Remove ${c.name}`} className="icon-btn h-10 w-10 text-critical"><Trash2 size={17} /></button>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => setAdding(true)} className="btn btn-secondary btn-lg btn-block mt-4"><Plus size={18} /> Add a caregiver</button>
      {adding && <AddCaregiver close={() => setAdding(false)} added={(c) => { setList((l) => [c, ...(l ?? [])]); setAdding(false); }} />}
    </>
  );
}

function AddCaregiver({ close, added }: { close: () => void; added: (c: Caregiver) => void }) {
  const [f, setF] = useState({ name: "", relationship: "", phone: "", pin: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const wantsSignIn = f.phone.length > 0;
  const valid = f.name && f.relationship && (!wantsSignIn || f.pin.length >= 4);
  return (
    <Sheet title="Add a caregiver" close={close}>
      <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault(); if (!valid) return;
        setBusy(true); setError("");
        try { added(await patientApi.addCaregiver(wantsSignIn ? f : { name: f.name, relationship: f.relationship })); }
        catch (err) { setError(err instanceof ApiError ? err.message : "Couldn't add that caregiver."); }
        finally { setBusy(false); }
      }}>
        <TextField label="Full name" value={f.name} onChange={(v) => setF((x) => ({ ...x, name: v }))} />
        <TextField label="Relationship" value={f.relationship} onChange={(v) => setF((x) => ({ ...x, relationship: v }))} />
        <TextField label="Phone (optional)" type="tel" inputMode="tel" value={f.phone} onChange={(v) => setF((x) => ({ ...x, phone: v }))} />
        {wantsSignIn && <>
          <TextField label="Their sign-in PIN (4–6 digits)" inputMode="numeric" value={f.pin} onChange={(v) => setF((x) => ({ ...x, pin: v.replace(/\D/g, "").slice(0, 6) }))} />
          <p className="text-footnote text-ink-2">With a phone and PIN they can sign in separately and respond to access requests for you. They can't open your vault.</p>
        </>}
        {error && <p role="alert" className="rounded-[14px] bg-critical-tint px-3.5 py-2.5 text-footnote text-critical">{error}</p>}
        <button type="submit" disabled={!valid || busy} className="btn btn-primary btn-lg btn-block">{busy ? "Adding…" : "Add caregiver"}</button>
      </form>
    </Sheet>
  );
}
