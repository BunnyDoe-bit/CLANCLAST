import { Lock, ShieldCheck, Wifi } from "lucide-react";
import { landingImages } from "./landingAssets";

const points = [
  { icon: Lock, title: "Consent-led by design", desc: "Every access to a record is patient-approved and logged, not assumed." },
  { icon: Wifi, title: "Works with what you have", desc: "Connects to existing hospital and clinic systems instead of replacing them." },
  { icon: ShieldCheck, title: "Built for verification", desc: "Identity and credential checks that take a moment, not a phone call." },
];

/**
 * Interoperability / trust section: pairs the Humanet interoperability deck's
 * Africa network illustration with a short set of trust commitments, and a
 * community outreach photo to ground the platform in real, local care.
 */
export function TrustStrip() {
  return (
    <section className="bg-[#f7f9f7] py-20" aria-labelledby="trust-heading">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 sm:px-10 lg:grid-cols-2">
        <div>
          <p className="mb-3.5 text-sm font-semibold text-primary">Interoperability, not another silo</p>
          <h2 id="trust-heading" className="mb-6 font-display text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
            A connected record, built for how care actually moves across a continent.
          </h2>
          <ul className="space-y-6">
            {points.map((p) => (
              <li key={p.title} className="flex gap-4">
                <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
                  <p.icon size={20} />
                </div>
                <div>
                  <p className="font-display text-base font-bold text-foreground">{p.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{p.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="overflow-hidden rounded-[30px] border border-border bg-white shadow-[0_28px_80px_-40px_rgba(20,75,62,.35)]">
          <img
            src={landingImages.africaNetwork.src}
            width={landingImages.africaNetwork.width}
            height={landingImages.africaNetwork.height}
            alt={landingImages.africaNetwork.alt}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-7xl px-6 sm:px-10">
        <div className="grid items-center gap-10 rounded-[30px] bg-white p-8 shadow-[0_10px_30px_-24px_rgba(21,45,37,.45)] lg:grid-cols-[1fr_1.1fr] lg:p-12">
          <div className="overflow-hidden rounded-[22px]">
            <img
              src={landingImages.community.src}
              width={landingImages.community.width}
              height={landingImages.community.height}
              alt={landingImages.community.alt}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-primary">Rooted in community health</p>
            <p className="font-display text-2xl font-extrabold leading-snug text-foreground">
              Interoperability only matters if it reaches the clinics people actually walk into.
            </p>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              ClanClast is built alongside community outreach programmes, not just hospital IT
              departments — so identity and consent travel to USSD and low-connectivity settings too.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
