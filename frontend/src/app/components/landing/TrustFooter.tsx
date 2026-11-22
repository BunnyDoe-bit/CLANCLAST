import { Fingerprint, ShieldCheck } from "lucide-react";

const columns: { heading: string; links: string[] }[] = [
  { heading: "Platform", links: ["Patient experience", "Provider workspace", "Interoperability layer", "Verification"] },
  { heading: "Company", links: ["About", "Careers", "Press", "Contact"] },
  { heading: "Resources", links: ["Documentation", "Support center", "System status", "Security"] },
];

/**
 * Closing footer panel: rounded-top dark card with link columns, a
 * newsletter signup, and generic trust signals. All copy, numbers and the
 * "certification" badge below are explicit placeholders — nothing here
 * claims a real review count or a real third-party certification, and none
 * of it is modeled on any specific company's actual footer content.
 */
export function TrustFooter() {
  return (
    <footer className="bg-background px-4 pb-4 pt-10 sm:px-6">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[30px] bg-[#0d3a32] px-6 py-14 text-white sm:px-12">
        <div className="grid gap-12 sm:grid-cols-[1fr_1fr_1fr_1.1fr]">
          {columns.map((col) => (
            <div key={col.heading}>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[#8fd9c4]">{col.heading}</p>
              <ul className="space-y-3 text-sm text-white/80">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="transition hover:text-white">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="rounded-[22px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm">
            <p className="mb-3 text-sm font-bold">Stay in the loop</p>
            <form className="flex items-center gap-2 border-b border-white/25 pb-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Enter your email*"
                className="w-full bg-transparent text-sm text-white placeholder:text-white/45 focus:outline-none"
              />
              <button type="submit" className="whitespace-nowrap text-sm font-semibold text-[#8fd9c4] transition hover:text-white">
                Subscribe
              </button>
            </form>
            <p className="mt-3 text-xs leading-5 text-white/45">
              By signing up, you agree to ClanClast Health's data protection policy.
            </p>
          </div>
        </div>

        <div className="my-10 h-px bg-white/10" />

        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#0d3a32]">
              <Fingerprint size={18} strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-extrabold">clanclast health</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#8fd9c4]" />
              <span>Placeholder — trust &amp; compliance badge</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-white">LinkedIn</a>
              <a href="#" className="hover:text-white">Instagram</a>
              <a href="#" className="hover:text-white">X</a>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="#" className="hover:text-white/70">Terms</a>
            <a href="#" className="hover:text-white/70">Privacy</a>
            <a href="#" className="hover:text-white/70">Cookie policy</a>
          </div>
          <span>© {new Date().getFullYear()} ClanClast Health. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
