import Link from "next/link";
import { CalendarDays, CircleUserRound } from "lucide-react";
import { Brand } from "./brand";
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#dce1dc] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <Brand />
        <nav
          className="flex items-center gap-1 sm:gap-3"
          aria-label="Navegação principal"
        >
          <Link
            href="/minhas-reservas"
            className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-[#4e5b55] hover:bg-[#f0f2ef]"
          >
            <CalendarDays size={18} />
            <span className="hidden sm:inline">Minhas reservas</span>
          </Link>
          <Link
            href="/entrar"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[#cfd6d1] bg-white px-3 text-sm font-semibold hover:bg-[#f0f2ef]"
          >
            <CircleUserRound size={18} />
            <span className="hidden sm:inline">Entrar</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
