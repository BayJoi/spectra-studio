import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import UnoCSS from "@unocss/vite";
import glsl from "vite-plugin-glsl";

function stripUnsafeInlineCsp(): import("vite").Plugin {
  return {
    name: "strip-unsafe-inline-csp",
    transformIndexHtml(html) {
      return html.replace(
        /script-src\s+'self'\s+'unsafe-inline'/g,
        "script-src 'self'",
      );
    },
    enforce: "post",
  };
}

export default defineConfig({
  plugins: [react(), UnoCSS(), glsl(), stripUnsafeInlineCsp()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  build: {
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'jotai'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
