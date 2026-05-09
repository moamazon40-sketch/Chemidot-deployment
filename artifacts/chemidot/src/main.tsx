import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { LanguageProvider } from "./lib/i18n";
import { setBaseUrl } from "@workspace/api-client-react";

const apiBaseUrl = import.meta.env.VITE_API_URL?.trim();
if (apiBaseUrl) {
  // Safety: avoid accidentally pointing the frontend at a different origin in production.
  // If VITE_API_URL does not match the current origin, fall back to same-origin relative /api.
  try {
    const targetOrigin = new URL(apiBaseUrl).origin;
    if (typeof window !== "undefined" && targetOrigin !== window.location.origin) {
      // eslint-disable-next-line no-console
      console.warn(
        `Ignoring VITE_API_URL (${apiBaseUrl}) because it does not match current origin (${window.location.origin}).`
      );
    } else {
      setBaseUrl(apiBaseUrl);
    }
  } catch {
    // If it's not a valid absolute URL, do nothing and let the client use same-origin /api.
  }
}

createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <App />
  </LanguageProvider>
);
