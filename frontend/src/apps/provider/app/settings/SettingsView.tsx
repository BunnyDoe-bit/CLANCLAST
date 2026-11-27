import { useEffect, useState } from "react";
import { Check, LogOut, Moon, Building2 } from "lucide-react";
import { ApiError, authApi, providerApi } from "../../lib/api";
import { setPrefs, usePrefs, type Theme } from "../lib/preferences";
import { Segmented, TextField } from "../ui/controls";

/** Your profile, your institution, and this device's preferences. */
export default function SettingsView({ onSignOut, onProfile }: { onSignOut: () => void; onProfile: (p: { fullName: string; role: string }) => void }) {
  const prefs = usePrefs();
  const [me, setMe] = useState<{ fullName: string; role: string; organization: { name: string; status: string } } | null>(null);
  const [f, setF] = useState({ fullName: "", role: "" });
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  useEffect(() => { authApi.me().then((m) => { const p = m.provider ?? m; setMe(p); setF({ fullName: p.fullName, role: p.role }); }).catch(() => {}); }, []);
  const dirty = !!me && (f.fullName.trim() !== me.fullName || f.role.trim() !== me.role);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setState("saving"); setError("");
    try {
      const u = await providerApi.updateProfile({ fullName: f.fullName.trim(), role: f.role.trim() });
      setMe((m) => m && { ...m, fullName: u.fullName, role: u.role }); onProfile({ fullName: u.fullName, role: u.role });
      setState("saved"); setTimeout(() => setState("idle"), 1600);
    } catch (err) { setError(err instanceof ApiError ? err.message : "Couldn’t save."); setState("idle"); }
  }

  return (
    <>
      <div className="mb-5"><h1 className="large-title">Settings</h1></div>
      <div className="grid items-start gap-3 @4xl/app:grid-cols-2">
        <section className="glass p-5">
          <h2 className="mb-4 text-headline font-semibold">Your profile</h2>
          <form onSubmit={save} className="space-y-4">
            <TextField label="Full name" value={f.fullName} onChange={(v) => setF((x) => ({ ...x, fullName: v }))} />
            <TextField label="Role" value={f.role} onChange={(v) => setF((x) => ({ ...x, role: v }))} placeholder="e.g. Primary care physician" />
            {error && <p role="alert" className="text-footnote text-critical">{error}</p>}
            <button type="submit" disabled={!dirty || state === "saving" || f.fullName.trim().length < 2} className="btn btn-primary">{state === "saved" ? <><Check size={16} /> Saved</> : state === "saving" ? "Saving…" : "Save"}</button>
          </form>
        </section>
        <div className="grid gap-3">
          <section className="glass p-5">
            <h2 className="mb-3 flex items-center gap-2 text-headline font-semibold"><Building2 size={18} className="text-accent" /> Institution</h2>
            <p className="text-subhead font-semibold">{me?.organization.name ?? " "}</p>
            <p className="mt-1 flex items-center gap-2 text-footnote text-ink-2"><i className={`h-2 w-2 rounded-full ${me?.organization.status === "CONNECTED" ? "bg-positive" : "bg-warning"}`} />{me?.organization.status === "CONNECTED" ? "Verified and connected to CLANCLAST" : "Pending verification by CLANCLAST"}</p>
          </section>
          <section className="glass p-5">
            <h2 className="mb-3 flex items-center gap-2 text-headline font-semibold"><Moon size={18} className="text-accent" /> Appearance on this device</h2>
            <Segmented<Theme> label="Appearance" value={prefs.theme} onChange={(theme) => setPrefs({ theme })} options={[{ v: "system", label: "Automatic" }, { v: "light", label: "Light" }, { v: "dark", label: "Dark" }]} />
          </section>
          <button onClick={onSignOut} className="btn btn-quiet btn-block text-critical"><LogOut size={16} /> Sign out</button>
        </div>
      </div>
    </>
  );
}
