import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  // GitHub Pages : /studio-jannah/app-demo/ ; Capacitor : chemin relatif.
  base: process.env.GITHUB_ACTIONS === "true" ? "/studio-jannah/app-demo/" : "./",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        admin: resolve(__dirname, "admin/index.html"),
      },
    },
  },
});
