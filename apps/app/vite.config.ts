import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  // Capacitor-ready: relative base for file/capacitor serving later
  base: "./",
});
