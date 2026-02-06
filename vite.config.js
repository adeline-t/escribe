import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "frontend",
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@react-pdf")) return "pdf";
          if (id.includes("react-icons")) return "react-icons";
          if (id.includes("react-dom") || id.includes("react")) return "react";
          return "vendor";
        }
      }
    }
  }
});
