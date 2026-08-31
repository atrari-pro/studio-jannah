import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { Admin } from "./Admin";
import "./styles.css";
import { bridgeConsentFromCookie, initSjDataLayer, trackPageView } from "@studio-jannah/shared/datalayer";

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

  // /app-demo est servi sous le même domaine que le site public (même
  // origine) mais n'a pas sa propre CMP : on relit le consentement déjà
  // donné sur le site (cookie sj_cmp_consent) plutôt que de dupliquer un
  // bandeau ici. Sans consentement préalable, le funnel reste gated comme
  // n'importe quelle autre page (aucun GTM chargé, rien perdu).
  bridgeConsentFromCookie(import.meta.env.PUBLIC_GTM_ID as string | undefined);

  trackPageView("/app-demo", "Studio Jannah — Démo signal", {
    page_type: "app_demo",
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>{isAdmin ? <Admin /> : <App />}</StrictMode>,
);
