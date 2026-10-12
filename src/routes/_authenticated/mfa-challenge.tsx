import { createFileRoute, redirect } from "@tanstack/react-router";

// Ruta heredada: el segundo paso se pide ahora en /login. Se conserva para no
// romper enlaces ni marcadores.
export const Route = createFileRoute("/_authenticated/mfa-challenge")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});
