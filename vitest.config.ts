import { defineConfig } from "vitest/config";
import path from "node:path";

// Config de tests separada de vite.config.ts porque este último está
// envuelto por @lovable.dev/vite-tanstack-config (plugins de SSR/Cloudflare
// que no hacen falta para testear funciones puras de src/lib).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
