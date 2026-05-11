import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: "react", replacement: path.resolve(__dirname, "../../node_modules/react") },
      { find: "react-dom", replacement: path.resolve(__dirname, "../../node_modules/react-dom") }
    ]
  }
});

