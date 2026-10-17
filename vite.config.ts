import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tagger from "@dhiwise/component-tagger";
import { pilotHtml } from './services/hls-pilot/app-proxy.mjs';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: "build",
    chunkSizeWarningLimit: 2000,
    sourcemap: false,
    minify: 'esbuild',
    target: 'esnext',
  },
  plugins: [tsconfigPaths(), react(), tagger(), {
    name: 'private-hls-pilot-csp',
    transformIndexHtml: (html, context) => pilotHtml(html, context.originalUrl || context.path),
  }],
  server: {
    port: 5000,
    host: "0.0.0.0",
    strictPort: true,
    allowedHosts: true
  },
  preview: {
    port: 5000,
    host: "0.0.0.0",
    strictPort: true
  }
});