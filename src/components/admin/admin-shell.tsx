"use client";

import { Bell, ChevronDown, Menu, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useSyncExternalStore } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { ThemeToggle } from "../theme-toggle";
export type AdminUser = { name: string; role: string };

const DRAWER_ID = "admin-mobile-navigation";

function drawer() {
  return document.getElementById(DRAWER_ID);
}

function closeDrawer() {
  const element = drawer();
  if (element?.matches(":popover-open")) element.hidePopover();
}

/**
 * Quem abre a gaveta é o navegador, então o estado dela mora no DOM — ler de lá
 * é o que mantém o `aria-expanded` verdadeiro mesmo quando o toque aconteceu
 * antes de este componente existir.
 */
function useDrawerOpen() {
  const subscribe = useCallback((onChange: () => void) => {
    const element = drawer();
    element?.addEventListener("toggle", onChange);
    return () => element?.removeEventListener("toggle", onChange);
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => drawer()?.matches(":popover-open") ?? false,
    () => false,
  );
}

/**
 * A gaveta do telefone abre pelo `popover` do próprio navegador, não por estado
 * do React: antes o botão só respondia depois de o JavaScript da página
 * carregar, e um toque dado nesse intervalo — que é justamente o primeiro,
 * assim que a tela aparece — era perdido sem qualquer sinal. Escape, clique
 * fora e a camada superior vêm de graça, e a navegação passa a funcionar mesmo
 * enquanto o resto da página ainda está sendo hidratado.
 */
export function AdminShell({
  children,
  user,
}: {
  children: ReactNode;
  user: AdminUser;
}) {
  const open = useDrawerOpen();
  return (
    <div className="min-h-screen bg-surface-page lg:flex">
      <AdminSidebar user={user} />
      <AdminSidebar mobile user={user} onNavigate={closeDrawer} />
      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-b border-border-subtle bg-surface-raised px-4 sm:px-6">
          <button
            className="grid size-10 place-items-center rounded-md border border-[var(--border-control)] lg:hidden"
            title="Abrir menu"
            aria-controls={DRAWER_ID}
            aria-expanded={open}
            popoverTarget={DRAWER_ID}
            popoverTargetAction="show"
          >
            <Menu size={19} />
          </button>
          <div className="hidden max-w-sm flex-1 items-center gap-2 rounded-md bg-surface-page px-3 md:flex">
            <Search size={17} className="text-[var(--text-secondary)]" />
            <input
              aria-label="Buscar no painel"
              placeholder="Buscar reserva, cliente ou sala"
              className="h-10 w-full bg-transparent text-subheadline"
            />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              className="relative grid size-10 place-items-center rounded-md hover:bg-surface-page"
              title="Notificações"
            >
              <Bell size={19} />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-danger-action" />
            </button>
            <button className="hidden h-10 items-center gap-2 rounded-md px-2 text-subheadline font-semibold hover:bg-surface-page sm:flex">
              Ágora Coworking
              <ChevronDown size={16} />
            </button>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

/** Fecha a gaveta pelo próprio `popover`, sem precisar do JavaScript da página. */
export function DrawerCloseButton() {
  return (
    <button
      aria-label="Fechar menu"
      popoverTarget={DRAWER_ID}
      popoverTargetAction="hide"
      className="absolute right-2 top-3 grid size-10 place-items-center rounded-md text-white hover:bg-white/10"
    >
      <X size={20} />
    </button>
  );
}
