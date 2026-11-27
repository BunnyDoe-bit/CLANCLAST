import { useEffect, useState } from "react";
import { MavenLanding, type Channel } from "./components/landing/MavenLanding";
import { CaregiverPortal, UssdSimulator } from "./channels/Channels";

/**
 * The marketing site. The real patient app and provider workspace are separate pages
 * (/patient, /provider); the two channel demos for people without a smartphone open
 * here, addressed by #ussd and #caregiver so they can be linked to directly.
 */
const read = (): Channel | null => (window.location.hash === "#ussd" ? "ussd" : window.location.hash === "#caregiver" ? "caregiver" : null);

export default function App() {
  const [channel, setChannel] = useState<Channel | null>(read);
  useEffect(() => {
    const on = () => setChannel(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  useEffect(() => {
    if (channel) { window.scrollTo(0, 0); return; }
    const id = window.location.hash.slice(1);
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
  }, [channel]);

  const open = (c: Channel) => { window.location.hash = c; };
  const back = () => { window.location.hash = "try"; };

  return (
    <main className="min-h-screen bg-background font-body text-foreground">
      {channel === "ussd" ? <UssdSimulator back={back} /> : channel === "caregiver" ? <CaregiverPortal back={back} /> : <MavenLanding setContext={open} />}
    </main>
  );
}
