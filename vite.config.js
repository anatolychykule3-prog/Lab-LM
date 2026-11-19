import { defineConfig } from "vite";

// Pages: index.html (arena), runner.html (side-scroller), tetris.html (tetris).
export default defineConfig({
  build: {
    rollupOptions: {
      input: { main: "index.html", runner: "runner.html", tetris: "tetris.html" },
    },
  },
});
