import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages serves this repo at /sawitpro-field-sales/, not the domain root.
const BASE = "/sawitpro-field-sales/";

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "SawitPRO Field Sales",
        short_name: "SawitPRO",
        description: "Field sales visit, customer, and price intelligence app",
        theme_color: "#1b7a3d",
        background_color: "#f4f7f2",
        display: "standalone",
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: `${BASE}icon-192.svg`, sizes: "192x192", type: "image/svg+xml" },
          { src: `${BASE}icon-512.svg`, sizes: "512x512", type: "image/svg+xml" }
        ]
      }
    })
  ],
  server: {
    host: true
  }
});
