import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      enforma: resolve(__dirname, '../../packages/enforma/src'),
      'enforma-joy': resolve(__dirname, '../../packages/enforma-joy/src'),
    },
  },
});
