import { defineConfig } from "astro/config";
import rehypeArticleImages from "./src/lib/rehype-article-images.mjs";

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
  markdown: {
    // Emplacements dynamiques d'images dans les insights/use cases — voir
    // rehype-article-images.mjs. No-op sur tout Markdown sans image locale,
    // donc aucun impact sur le contenu existant.
    rehypePlugins: [[rehypeArticleImages, { base }]],
  },
  vite: {
    server: {
      fs: {
        allow: ["../.."],
      },
    },
  },
});
