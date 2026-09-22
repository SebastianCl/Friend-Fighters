import { defineConfig } from "vite";
export default defineConfig({
  server: { watch: { usePolling: true } },
  build: {
    rollupOptions: {
      input: { game: "index.html", visual: "visual-preview.html" },
      output: { manualChunks: { phaser: ["phaser"] } },
    },
  },
});
