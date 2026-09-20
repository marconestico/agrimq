import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev /api va sul server Node, così i path restano relativi.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
