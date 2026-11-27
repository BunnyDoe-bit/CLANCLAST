import { createRoot } from "react-dom/client";
import "../app/components/landing/maven-landing.css";
import "../styles/index.css";
import "./pitch.css";
import { Deck } from "./Deck";

createRoot(document.getElementById("root")!).render(<Deck />);
