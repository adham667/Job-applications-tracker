import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  base: "./",
  plugins: [react()],
  root: path.resolve(__dirname, "src/renderer-react"),
  build: {
    outDir: path.resolve(__dirname, "src/renderer/dist"),
    emptyOutDir: true,
  },
});
