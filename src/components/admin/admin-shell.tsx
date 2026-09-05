"use client";

import { Bell, ChevronDown, Menu, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { AdminSidebar } from "./admin-sidebar";
export function AdminShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-surface-page lg:flex">
      <AdminSidebar />
      {menuOpen && (
        <>
          <button
            aria-label="Fechar menu"
            className="fixed inset-0 z-40 bg-black/45 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div className="lg:hidden">
            <AdminSidebar mobile onNavigate={() => setMenuOpen(false)} />
            <button
              aria-label="Fechar menu"
              className="fixed left-[228px] top-3 z-[60] grid size-10 place-items-center rounded-md text-white hover:bg-white/10"
              onClick={() => setMenuOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
        </>
      )}
      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-b border-border-subtle bg-surface-raised px-4 sm:px-6">
          <button
            className="grid size-10 place-items-center rounded-md border border-[var(--border-control)] lg:hidden"
            title="Abrir menu"
            aria-controls="admin-mobile-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={19} />
          </button>
          <div className="hidden max-w-sm flex-1 items-center gap-2 rounded-md bg-surface-page px-3 md:flex">
            <Search size={17} className="text-[var(--text-secondary)]" />
            <input
              aria-label="Buscar no painel"
              placeholder="Buscar reserva, cliente ou sala"
              className="h-10 w-full bg-transparent text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              className="relative grid size-10 place-items-center rounded-md hover:bg-surface-page"
              title="Notificações"
            >
              <Bell size={19} />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-danger-action" />
            </button>
            <button className="hidden h-10 items-center gap-2 rounded-md px-2 text-sm font-semibold hover:bg-surface-page sm:flex">
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
