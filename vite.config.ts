import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import UnoCSS from "@unocss/vite";
import glsl from "vite-plugin-glsl";

export default defineConfig({
  plugins: [react(), UnoCSS(), glsl()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  build: {
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
