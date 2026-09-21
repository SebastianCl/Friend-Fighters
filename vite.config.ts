import { defineConfig } from "vite";
export default defineConfig({
  server: { watch: { usePolling: true } },
  build: {
    rollupOptions: { output: { manualChunks: { phaser: ["phaser"] } } },
  },
});
