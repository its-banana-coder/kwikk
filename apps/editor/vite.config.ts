import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, "")
      },
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
    // Never pre-bundle workspace packages — always resolve from source so
    // changes to packages/* are immediately reflected without cache busting.
    exclude: [
      "@kwikk/scene-graph",
      "@kwikk/shared-types",
      "@kwikk/animation-engine",
      "@kwikk/render-core",
      "@kwikk/timeline",
      "@kwikk/ui-kit"
    ]
  },
  resolve: {
    dedupe: ["react", "react-dom"]
  }
});

