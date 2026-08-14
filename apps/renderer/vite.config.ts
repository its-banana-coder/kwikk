import path from "path";
import { defineConfig } from "vite";

// This app is loaded headlessly by export-runner.ts's Puppeteer capture — it has no UI of
// its own, only window.__kwikk (see src/main.ts). CSSSceneRenderer's normalizeAssetSrc()
// strips the origin off locally-hosted asset URLs (http://localhost:8080/uploads/... →
// /uploads/...), which only resolves correctly if this dev server proxies that path to the
// API — exactly like apps/editor/vite.config.ts already does. Without it, every relative
// /uploads/ request here 404s against Vite's own SPA fallback (200 + index.html body), the
// <img>/<video> silently fails to decode, and every scene background renders blank.
export default defineConfig({
  server: {
    proxy: {
      "/uploads": {
        target: "http://localhost:8080",
        changeOrigin: true
      },
      "/system": {
        target: "http://localhost:8080",
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    exclude: [
      "@kwikk/scene-graph",
      "@kwikk/shared-types",
      "@kwikk/render-core",
      "@kwikk/timeline"
    ]
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: "react", replacement: path.resolve(__dirname, "../../node_modules/react") },
      { find: "react-dom", replacement: path.resolve(__dirname, "../../node_modules/react-dom") }
    ]
  }
});
