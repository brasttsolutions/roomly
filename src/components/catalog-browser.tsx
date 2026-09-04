"use client";
import { useMemo, useState } from "react";
import { Building2, CalendarDays, Search, UsersRound } from "lucide-react";
import type { Room } from "@/lib/demo-data";
import { addIsoDays, nextBookableDay } from "@/lib/utils";
import { RoomCard } from "./room-card";
export function CatalogBrowser({
  rooms,
  today,
}: {
  rooms: readonly Room[];
  /** Dia corrente no fuso da operação, calculado no servidor. */
  today: string;
}) {
  const [capacity, setCapacity] = useState("all");
  const filtered = useMemo(
    () =>
      capacity === "all"
        ? rooms
        : rooms.filter((r) => r.capacity >= Number(capacity)),
    [capacity, rooms],
  );
  return (
    <>
      <div className="mb-8 grid border border-[#d7ddd8] bg-white md:grid-cols-[1.2fr_1fr_1fr_auto]">
        <div className="flex min-h-16 items-center gap-3 border-b border-[#e2e6e2] px-4 md:border-b-0 md:border-r">
          <Building2 size={19} className="text-[#176b4d]" />
          <span>
            <span className="block text-[11px] font-bold uppercase text-[var(--text-secondary)]">
              Unidade
            </span>
            <span className="text-sm font-semibold">Todas as unidades</span>
          </span>
        </div>
        <label className="flex min-h-16 items-center gap-3 border-b border-[#e2e6e2] px-4 md:border-b-0 md:border-r">
          <CalendarDays size={19} className="text-[#176b4d]" />
          <span>
            <span className="block text-[11px] font-bold uppercase text-[var(--text-secondary)]">
              Data
            </span>
            <input
              aria-label="Data da reserva"
              type="date"
              defaultValue={nextBookableDay(today)}
              min={addIsoDays(today, 1)}
              className="bg-transparent text-sm font-semibold"
            />
          </span>
        </label>
        <label className="flex min-h-16 items-center gap-3 px-4 md:border-r">
          <UsersRound size={19} className="text-[#176b4d]" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase text-[var(--text-secondary)]">
              Pessoas
            </span>
            <select
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold"
            >
              <option value="all">Qualquer capacidade</option>
              <option value="4">4 ou mais</option>
              <option value="8">8 ou mais</option>
              <option value="12">12 ou mais</option>
            </select>
          </span>
        </label>
        <button className="m-2 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#176b4d] px-5 text-sm font-bold text-white hover:bg-[#11543d]">
          <Search size={18} />
          Buscar
        </button>
      </div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Disponíveis para você</h2>
          <p
            role="status"
            aria-live="polite"
            className="mt-1 text-sm text-[#66736d]"
          >
            {filtered.length}{" "}
            {filtered.length === 1 ? "sala encontrada" : "salas encontradas"}
          </p>
        </div>
        <select
          aria-label="Ordenar salas"
          className="h-10 rounded-md border border-[var(--border-control)] bg-white px-3 text-sm font-semibold"
        >
          <option>Recomendadas</option>
          <option>Menor preço</option>
          <option>Maior capacidade</option>
        </select>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {filtered.map((room, index) => (
          <div key={room.id} className={index === 0 ? "lg:col-span-2" : ""}>
            <RoomCard room={room} featured={index === 0} />
          </div>
        ))}
      </div>
    </>
  );
}
