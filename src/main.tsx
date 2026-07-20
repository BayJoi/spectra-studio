import { createRoot } from "react-dom/client";
import App from "./App";
import "virtual:uno.css";
import "./index.css";

// Clickjacking protection (inline scripts are blocked by CSP in production,
// so this lives in the bundle instead of index.html)
if (window.self !== window.top) {
  window.top!.location.href = window.self.location.href;
}

createRoot(document.getElementById("root")!).render(<App />);
