import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter/wght.css";
import "./pitch.css";
import { Deck } from "./Deck";

createRoot(document.getElementById("root")!).render(<Deck />);
