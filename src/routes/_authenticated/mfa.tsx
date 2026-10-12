import { createFileRoute } from "@tanstack/react-router";
import { TwoFactorCard } from "@/components/TwoFactorCard";

export const Route = createFileRoute("/_authenticated/mfa")({
  component: MfaPage,
  head: () => ({
    meta: [{ title: "Verificación en dos pasos — IngreSaaS" }],
  }),
});

function MfaPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Verificación en dos pasos</h1>
        <p className="text-sm text-muted-foreground">
          Protege tu cuenta con un código de una app autenticadora (Google Authenticator, Authy o similar).
        </p>
      </div>
      <TwoFactorCard />
    </div>
  );
}
