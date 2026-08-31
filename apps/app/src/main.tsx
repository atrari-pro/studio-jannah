import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { Admin } from "./Admin";
import "./styles.css";
import { initSjDataLayer, trackPageView } from "@studio-jannah/shared/datalayer";

// Routing volontairement minimal : pas de librairie, un simple test sur le
// chemin. /admin (sous quelque base que ce soit) sert l'Admin, tout le
// reste sert le wizard démo public existant.
const isAdmin = window.location.pathname.includes("/admin");

if (!isAdmin) {
  initSjDataLayer({
    page_path: "/app-demo",
    page_title: "Studio Jannah — Démo signal",
    page_type: "app_demo",
  });

  trackPageView("/app-demo", "Studio Jannah — Démo signal", {
    page_type: "app_demo",
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>{isAdmin ? <Admin /> : <App />}</StrictMode>,
);
