import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { DemoBar } from "../../demo/DemoBar";

// Embedded on the landing page (?embed=1): open already signed in to the demo account.
try {
  if (new URLSearchParams(window.location.search).has("embed") && !localStorage.getItem("humanet_patient_token")) localStorage.setItem("humanet_patient_token", "demo:patient:pt_thandiwe");
} catch { /* storage blocked */ }

createRoot(document.getElementById("root")!).render(<><App /><DemoBar app="patient" /></>);

