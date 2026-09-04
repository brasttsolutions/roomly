"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  UserPen,
} from "lucide-react";
import { signOut } from "@/app/entrar/actions";

export function UserMenu({
  name,
  email,
  roleLabel,
  canManage,
}: {
  name: string;
  email: string;
  roleLabel: string;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={container}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        data-testid="user-menu-trigger"
        className="inline-flex h-10 max-w-[220px] items-center gap-2 rounded-md border border-[var(--border-control)] bg-white px-3 text-sm font-semibold hover:bg-surface-page"
      >
        <CircleUserRound size={18} className="shrink-0" />
        <span className="hidden truncate sm:inline">{name}</span>
        <ChevronDown size={16} className="shrink-0 text-[var(--text-secondary)]" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Conta"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-border-subtle bg-white shadow-[0_18px_50px_rgba(34,56,46,.14)]"
        >
          <div className="border-b border-border-subtle px-4 py-3">
            <p className="truncate text-sm font-bold">{name}</p>
            <p className="truncate text-xs text-text-secondary">{email}</p>
            <p className="mt-1 text-[11px] font-bold uppercase text-text-link">
              {roleLabel}
            </p>
          </div>
          <div className="p-1.5">
            {canManage && (
              <Item
                href="/admin"
                icon={<LayoutDashboard size={17} />}
                label="Área administrativa"
                onNavigate={() => setOpen(false)}
              />
            )}
            <Item
              href="/conta"
              icon={<UserPen size={17} />}
              label="Editar conta"
              onNavigate={() => setOpen(false)}
            />
          </div>
          <form action={signOut} className="border-t border-border-subtle p-1.5">
            <button
              type="submit"
              role="menuitem"
              data-testid="sign-out"
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-semibold text-danger-text hover:bg-danger-surface"
            >
              <LogOut size={17} />
              Sair da conta
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Item({
  href,
  icon,
  label,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-page"
    >
      <span className="text-text-secondary">{icon}</span>
      {label}
    </Link>
  );
}
