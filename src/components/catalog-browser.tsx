"use client";
import { useMemo, useState } from "react";
import { Building2, CalendarDays, UsersRound, X } from "lucide-react";
import type { Room } from "@/lib/demo-data";
import { formatIsoDay } from "@/lib/utils";
import { useCatalogAvailability } from "./use-availability";
import { RoomCard } from "./room-card";
import { Alert } from "./ui/alert";
import { Button } from "./ui/button";
import { EmptyState } from "./ui/empty-state";

type Sort = "recommended" | "price" | "capacity";

const SORT_LABELS: Record<Sort, string> = {
  recommended: "Recomendadas",
  price: "Menor preço",
  capacity: "Maior capacidade",
};

export function CatalogBrowser({
  rooms,
  units,
  today,
}: {
  rooms: readonly Room[];
  /** Unidades ativas, para o filtro deixar de ser um rótulo. */
  units: readonly string[];
  /** Dia corrente no fuso da operação, calculado no servidor. */
  today: string;
}) {
  const [unit, setUnit] = useState("all");
  const [day, setDay] = useState(today);
  const [capacity, setCapacity] = useState("all");
  const [sort, setSort] = useState<Sort>("recommended");

  const availability = useCatalogAvailability(day, unit === "all" ? null : unit);
  const byRoom = useMemo(
    () =>
      new Map(
        (availability.data?.rooms ?? []).map((room) => [room.slug, room]),
      ),
    [availability.data],
  );

  const filtered = useMemo(() => {
    const list = rooms.filter(
      (room) =>
        (unit === "all" || room.location === unit) &&
        (capacity === "all" || room.capacity >= Number(capacity)),
    );
    if (sort === "price")
      return [...list].sort((a, b) => a.hourlyPriceCents - b.hourlyPriceCents);
    if (sort === "capacity")
      return [...list].sort((a, b) => b.capacity - a.capacity);
    return list;
  }, [rooms, unit, capacity, sort]);

  const chips = [
    unit !== "all" && { label: unit, clear: () => setUnit("all") },
    day !== today && {
      label: formatIsoDay(day),
      clear: () => setDay(today),
    },
    capacity !== "all" && {
      label: `${capacity} ou mais pessoas`,
      clear: () => setCapacity("all"),
    },
    sort !== "recommended" && {
      label: SORT_LABELS[sort],
      clear: () => setSort("recommended"),
    },
  ].filter((chip): chip is { label: string; clear: () => void } => Boolean(chip));

  return (
    <>
      <div className="mb-5 grid rounded-lg border border-border-subtle bg-surface-raised md:grid-cols-3">
        <label className="flex min-h-16 items-center gap-3 border-b border-border-subtle px-4 md:border-b-0 md:border-r">
          <Building2 size={19} className="text-text-link" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-caption font-bold uppercase text-text-secondary">
              Unidade
            </span>
            <select
              aria-label="Unidade"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              className="w-full bg-transparent text-subheadline font-semibold"
            >
              <option value="all">Todas as unidades</option>
              {units.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="flex min-h-16 items-center gap-3 border-b border-border-subtle px-4 md:border-b-0 md:border-r">
          <CalendarDays size={19} className="text-text-link" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-caption font-bold uppercase text-text-secondary">
              Data
            </span>
            <input
              aria-label="Data da reserva"
              type="date"
              value={day}
              // Hoje é reservável: os horários já vencidos vêm marcados na
              // resposta, então não há motivo para empurrar a busca para amanhã.
              min={today}
              onChange={(event) => setDay(event.target.value || today)}
              className="w-full bg-transparent text-subheadline font-semibold"
            />
          </span>
        </label>
        <label className="flex min-h-16 items-center gap-3 px-4">
          <UsersRound size={19} className="text-text-link" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-caption font-bold uppercase text-text-secondary">
              Pessoas
            </span>
            <select
              aria-label="Pessoas"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              className="w-full bg-transparent text-subheadline font-semibold"
            >
              <option value="all">Qualquer capacidade</option>
              <option value="4">4 ou mais</option>
              <option value="8">8 ou mais</option>
              <option value="12">12 ou mais</option>
            </select>
          </span>
        </label>
      </div>

      {chips.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.clear}
              aria-label={`Remover filtro ${chip.label}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border-control px-3 text-caption font-semibold hover:bg-surface-page"
            >
              {chip.label}
              <X size={13} aria-hidden="true" />
            </button>
          ))}
          <Button
            variant="link"
            className="text-caption"
            onClick={() => {
              setUnit("all");
              setDay(today);
              setCapacity("all");
              setSort("recommended");
            }}
          >
            Limpar filtros
          </Button>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-title3 font-bold">
            {day === today ? "Disponíveis hoje" : `Disponíveis em ${formatIsoDay(day)}`}
          </h2>
          <p
            role="status"
            aria-live="polite"
            className="mt-1 text-subheadline text-text-secondary"
          >
            {filtered.length}{" "}
            {filtered.length === 1 ? "sala encontrada" : "salas encontradas"}
          </p>
        </div>
        <label className="text-subheadline">
          <span className="sr-only">Ordenar salas</span>
          <select
            aria-label="Ordenar salas"
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
            className="h-11 rounded-md border border-border-control bg-surface-raised px-3 text-subheadline font-semibold"
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {availability.error && (
        <Alert tone="danger" title="Sem disponibilidade agora" className="mb-5">
          {availability.error} As salas continuam listadas, mas sem os horários.
        </Alert>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhuma sala com esses filtros"
          description="Tente outra unidade ou uma capacidade menor."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setUnit("all");
                setCapacity("all");
              }}
            >
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {filtered.map((room, index) => (
            <div key={room.id} className={index === 0 ? "lg:col-span-2" : ""}>
              <RoomCard
                room={room}
                availability={byRoom.get(room.slug)}
                loading={availability.loading}
                featured={index === 0}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
