import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";
import { DemoBar } from "../../demo/DemoBar";

// Embedded on the landing page (?embed=1): open already signed in to the demo account.
try {
  if (new URLSearchParams(window.location.search).has("embed") && !localStorage.getItem("cc_provider_token")) localStorage.setItem("cc_provider_token", "demo:provider:pr_naidoo");
} catch { /* storage blocked */ }

createRoot(document.getElementById("root")!).render(<><App /><DemoBar app="provider" /></>);
