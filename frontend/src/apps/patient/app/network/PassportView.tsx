import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, FileBadge, QrCode } from "lucide-react";
import { patientApi } from "../../lib/api";
import { BrandWeave } from "../brand/BrandWeave";
import { navigate } from "../lib/router";
import { fmtDate } from "../lib/format";
import { Sheet } from "../ui/Sheet";

/**
 * Health passport — identity plus institution-issued credentials (e.g. a vaccination
 * certificate). Credentials are allowed to live with CLANCLAST (Data Ownership Model);
 * clinical detail does not, so the old allergies/blood-type block is gone.
 */
type Credential = { id: string; type: string; status: string; issuer: string; issuedAt: string };
type Passport = { patient: { fullName: string; humanetId: string; identityVerified: boolean }; credentials: Credential[] };

export default function PassportView({ passport }: { passport: Passport | null }) {
  const [open, setOpen] = useState<Credential | null>(null);
  const p = passport?.patient;
  return (
    <>
      <div className="mb-5">
        <h1 className="large-title">Health passport</h1>
        <p className="mt-1 text-subhead text-ink-2">Your identity and the credentials institutions have issued to you.</p>
      </div>

      <section className="hero p-5">
        <BrandWeave preset="card" scrim="even" />
        <div className="relative z-10">
          <p className="text-caption font-semibold uppercase tracking-[0.14em] text-[var(--brand-300)]">CLANCLAST ID</p>
          <p className="mono mt-2 text-[1.5rem] font-medium tracking-[0.02em] text-white">{p?.humanetId ?? <span className="skeleton inline-block h-6 w-40 opacity-30" />}</p>
          <p className="text-subhead text-white/75">{p?.fullName ?? " "}</p>
          {p && (p.identityVerified
            ? <span className="badge mt-3 h-6 bg-white/15 text-white"><BadgeCheck size={13} strokeWidth={2.4} /> Identity verified</span>
            : <span className="badge mt-3 h-6 bg-[rgb(242_196_107/0.18)] text-[#f7d58e]">Identity not yet verified</span>)}
        </div>
      </section>

      <h2 className="mb-2 mt-6 px-1 text-footnote font-semibold uppercase tracking-[0.06em] text-ink-2">Credentials</h2>
      {!passport ? (
        <div className="list-group">{[0, 1].map((i) => <div key={i} className="list-row"><span className="skeleton h-10 w-10 !rounded-[12px]" /><span className="flex-1"><span className="skeleton block h-4 w-40" /><span className="skeleton mt-1.5 block h-3 w-52" /></span></div>)}</div>
      ) : passport.credentials.length === 0 ? (
        <div className="glass p-4 text-footnote text-ink-2">No credentials yet. When an institution issues one, such as a vaccination certificate, it appears here.</div>
      ) : (
        <ul className="list-group">
          {passport.credentials.map((c) => (
            <li key={c.id}>
              <button onClick={() => setOpen(c)} className="list-row">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-accent-tint text-accent"><FileBadge size={19} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-callout font-semibold">{c.type}</span>
                  <span className="tnum block truncate text-footnote text-ink-2">{c.issuer} · {fmtDate(c.issuedAt)}</span>
                </span>
                <span className="badge shrink-0 bg-positive-tint text-positive">{c.status}</span>
                <QrCode size={18} className="shrink-0 text-ink-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button onClick={() => navigate("vault")} className="glass press mt-4 flex w-full items-center gap-3 p-4 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-callout font-semibold">Looking for your health summary?</span>
          <span className="block text-footnote text-ink-2">Signed summaries from your clinics live in your vault.</span>
        </span>
        <span className="chev"><ArrowRight size={15} strokeWidth={2.2} /></span>
      </button>

      {open && <CredentialSheet c={open} close={() => setOpen(null)} />}
    </>
  );
}

function CredentialSheet({ c, close }: { c: Credential; close: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let u = "";
    patientApi.fetchCredentialQr(c.id).then((x) => { u = x; setUrl(x); }).catch(() => setFailed(true));
    return () => { if (u.startsWith("blob:")) URL.revokeObjectURL(u); };
  }, [c.id]);
  return (
    <Sheet title={c.type} close={close}>
      <p className="tnum text-footnote text-ink-2">Issued by {c.issuer} on {fmtDate(c.issuedAt)} · status as reported by the issuer: <b className="font-semibold text-ink">{c.status}</b></p>
      <div className="mx-auto mt-4 w-full max-w-[280px] overflow-hidden rounded-[20px] bg-white p-3">
        {url ? <img src={url} alt={`Verification code for ${c.type}`} className="aspect-square w-full" /> : failed
          ? <div className="grid aspect-square place-items-center text-center text-footnote text-critical">Couldn't load the code. Check your connection.</div>
          : <div className="skeleton aspect-square !rounded-[12px]" />}
      </div>
      <p className="mt-4 text-center text-footnote text-ink-2">Anyone can scan this to check the credential is genuine and still valid. It shows no other health information.</p>
    </Sheet>
  );
}
