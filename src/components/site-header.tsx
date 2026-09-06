import Link from "next/link";
import { CalendarDays, CircleUserRound, LayoutDashboard } from "lucide-react";
import { requestCustomer } from "@/lib/server/customer";
import { requestIdentity } from "@/lib/server/identity";
import { roleLabel } from "@/lib/roles";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export async function SiteHeader() {
  // Duas identidades, e a pessoa pode ter as duas: quem trabalha num coworking
  // também aluga sala. `requestIdentity` só enxerga quem tem perfil de equipe —
  // depois que o cliente virou identidade de plataforma, sem `profiles`, o
  // cabeçalho passou a mostrar "Entrar" para quem estava logado.
  const [identity, customer] = await Promise.all([
    requestIdentity(),
    requestCustomer(),
  ]);
  const canManage = identity ? identity.role !== "customer" : false;
  const account = identity
    ? { name: identity.name, email: identity.email, role: roleLabel(identity.role) }
    : customer
      ? { name: customer.name, email: customer.email, role: "Cliente" }
      : null;
  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-raised/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <Brand />
        <nav
          className="flex items-center gap-1 sm:gap-3"
          aria-label="Navegação principal"
        >
          <ThemeToggle />
          <Link
            href="/minhas-reservas"
            className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-subheadline font-semibold text-text-secondary hover:bg-surface-page"
          >
            <CalendarDays size={18} />
            <span className="hidden sm:inline">Minhas reservas</span>
          </Link>
          {canManage && (
            <Link
              href="/admin"
              data-testid="admin-entry"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-action-primary px-3 text-subheadline font-semibold text-text-on-accent hover:bg-action-primary-hover"
            >
              <LayoutDashboard size={18} />
              <span className="hidden sm:inline">Área administrativa</span>
            </Link>
          )}
          {account ? (
            <UserMenu
              name={account.name}
              email={account.email}
              roleLabel={account.role}
              canManage={canManage}
            />
          ) : (
            <Link
              href="/entrar"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border-control)] bg-surface-raised px-3 text-subheadline font-semibold hover:bg-surface-page"
            >
              <CircleUserRound size={18} />
              <span className="hidden sm:inline">Entrar</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
