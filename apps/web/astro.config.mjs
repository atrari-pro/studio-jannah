import { defineConfig } from "astro/config";

const base =
  process.env.PUBLIC_BASE_PATH ??
  (process.env.GITHUB_ACTIONS === "true" ? "/studio-jannah" : "/");

const site =
  process.env.PUBLIC_SITE_URL ?? "https://atrari-pro.github.io/studio-jannah";

export default defineConfig({
  site,
  base,
  trailingSlash: "never",
  build: {
    format: "directory",
  },
  vite: {
    server: {
      fs: {
        allow: ["../.."],
      },
    },
  },
});
