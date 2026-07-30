// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Claves públicas de Lovable Cloud (publishable/anon). Son seguras de exponer
// en el bundle del cliente y sirven de respaldo cuando el entorno de build de
// producción no recibe el archivo .env (que está fuera del control de versiones).
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://szmghoyszwgkowsnepus.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6bWdob3lzendna293c25lcHVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxOTU1NzEsImV4cCI6MjA5NDc3MTU3MX0.oHbNTAMQUnyVIiix28Ohusz2oZW9Ze3xFyb5IWLAw4s";
const SUPABASE_PROJECT_ID = process.env.VITE_SUPABASE_PROJECT_ID || "szmghoyszwgkowsnepus";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(SUPABASE_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(SUPABASE_PUBLISHABLE_KEY),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(SUPABASE_PROJECT_ID),
    },
  },
});
