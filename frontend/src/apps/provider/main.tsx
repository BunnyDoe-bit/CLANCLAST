import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";
import { DemoBar } from "../../demo/DemoBar";

createRoot(document.getElementById("root")!).render(<><App /><DemoBar app="provider" /></>);
