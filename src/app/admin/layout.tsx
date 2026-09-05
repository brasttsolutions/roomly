import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { requestIdentity } from "@/lib/server/identity";
import { integrationMode } from "@/lib/supabase/config";

export default async function Layout({ children }: { children: ReactNode }) {
  const identity = await requestIdentity();
  if (integrationMode() === "supabase") {
    if (!identity || identity.role === "customer") redirect("/");
  }
  // O nome de quem está no painel vinha escrito no componente. Agora vem da
  // sessão — no simulador, da identidade de demonstração.
  return (
    <AdminShell
      user={{
        name: identity?.name ?? "Equipe Roomly",
        role: ROLE_LABEL[identity?.role ?? "admin"] ?? "Administrador",
      }}
    >
      {children}
    </AdminShell>
  );
}

const ROLE_LABEL: Record<string, string> = {
  employee: "Operação",
  manager: "Gerente",
  admin: "Administrador",
  super_admin: "Administrador",
  customer: "Cliente",
};

