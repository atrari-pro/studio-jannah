import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import { initSjDataLayer, trackPageView } from "@studio-jannah/shared/datalayer";

initSjDataLayer({
  page_path: "/app-demo",
  page_title: "Studio Jannah — Démo signal",
  page_type: "app_demo",
  content_group: "product",
  surface: "app",
});

trackPageView("/app-demo", "Studio Jannah — Démo signal", {
  page_type: "app_demo",
  content_group: "product",
  surface: "app",
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
