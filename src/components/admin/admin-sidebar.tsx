"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarRange,
  CalendarDays,
  CreditCard,
  DoorClosed,
  FileClock,
  LayoutDashboard,
  MapPinned,
  Settings,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import type { AdminUser } from "./admin-shell";
const nav = [
  ["/admin", "Dashboard", LayoutDashboard],
  ["/admin/reservas", "Reservas", CalendarDays],
  ["/admin/calendario", "Calendário", CalendarRange],
  ["/admin/salas", "Salas", Building2],
  ["/admin/unidades", "Unidades", MapPinned],
  ["/admin/clientes", "Clientes", UsersRound],
  ["/admin/pagamentos", "Pagamentos", CreditCard],
  ["/admin/fechaduras", "Fechaduras", DoorClosed],
  ["/admin/limpeza", "Limpeza", Sparkles],
  ["/admin/relatorios", "Relatórios", BarChart3],
  ["/admin/logs", "Logs", FileClock],
  ["/admin/configuracoes", "Configurações", Settings],
] as const;
export function AdminSidebar({
  mobile = false,
  user,
  onNavigate,
}: {
  mobile?: boolean;
  user: AdminUser;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <aside
      id={mobile ? "admin-mobile-navigation" : undefined}
      className={cn(
        "w-60 shrink-0 flex-col bg-surface-inverse text-white",
        mobile
          ? "fixed inset-y-0 left-0 z-50 flex w-[280px] shadow-2xl"
          : "hidden lg:flex lg:min-h-screen",
      )}
    >
      <div className="px-5 py-5">
        <Brand inverse />
      </div>
      <nav className="flex-1 px-3 py-3" aria-label="Administração">
        {nav.map(([href, label, Icon]) => {
          const active =
            href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                // A barra coral de 3px marca a seção atual sem depender só do
                // preenchimento — que, em navy sobre navy, quase não aparece.
                "mb-1 flex h-10 items-center gap-3 rounded-md border-l-[3px] border-transparent px-3 text-subheadline font-semibold text-white/65 hover:bg-white/8 hover:text-white",
                active &&
                  "border-l-[var(--color-coral-400)] bg-white/12 text-[var(--color-coral-300)]",
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} size="lg" labelled />
          <div className="min-w-0">
            <p className="truncate text-subheadline font-bold">{user.name}</p>
            <p className="truncate text-caption text-white/45">{user.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
