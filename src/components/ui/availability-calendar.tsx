"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DaySummary } from "@/modules/availability/domain";
import { Button } from "./button";
import { Skeleton, LoadingRegion } from "./skeleton";
import { addIsoMonths, capitalizeFirst, cn } from "@/lib/utils";

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** Meio-dia UTC: longe de qualquer virada de fuso, o rótulo nunca escorrega. */
const noon = (day: string) => new Date(`${day}T12:00:00Z`);
const fmt = (day: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", ...options }).format(
    noon(day),
  );

const shiftDay = (day: string, amount: number) =>
  new Date(noon(day).getTime() + amount * 86_400_000).toISOString().slice(0, 10);

const selectable = (summary?: DaySummary) =>
  summary?.state === "free" || summary?.state === "partial";

export function AvailabilityCalendar({
  month,
  days,
  selected,
  onSelect,
  onMonthChange,
  loading,
  className,
}: {
  month: string;
  days: readonly DaySummary[];
  selected: string | null;
  onSelect: (day: string) => void;
  onMonthChange: (month: string) => void;
  loading?: boolean;
  className?: string;
}) {
  const byDay = new Map(days.map((day) => [day.day, day]));
  const first = days[0]?.day ?? `${month}-01`;
  const [focused, setFocused] = useState(selected ?? first);
  const cells = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<string | null>(null);

  // Ao virar o mês pelo teclado o dia alvo ainda não existe no DOM; o foco é
  // aplicado quando os dias do mês novo chegam.
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    const cell = cells.current.get(target);
    if (cell) {
      cell.focus();
      pendingFocus.current = null;
    }
  }, [days]);

  function move(target: string) {
    setFocused(target);
    const targetMonth = target.slice(0, 7);
    if (targetMonth !== month) {
      pendingFocus.current = target;
      onMonthChange(targetMonth);
      return;
    }
    cells.current.get(target)?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent, day: string) {
    const weekday = noon(day).getUTCDay();
    const moves: Record<string, () => void> = {
      ArrowLeft: () => move(shiftDay(day, -1)),
      ArrowRight: () => move(shiftDay(day, 1)),
      ArrowUp: () => move(shiftDay(day, -7)),
      ArrowDown: () => move(shiftDay(day, 7)),
      Home: () => move(shiftDay(day, -weekday)),
      End: () => move(shiftDay(day, 6 - weekday)),
      PageUp: () => move(`${addIsoMonths(month, -1)}-${day.slice(8)}`),
      PageDown: () => move(`${addIsoMonths(month, 1)}-${day.slice(8)}`),
    };
    const action = moves[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  }

  const offset = noon(first).getUTCDay();
  const grid: Array<string | null> = [
    ...Array.from({ length: offset }, () => null),
    ...days.map((day) => day.day),
  ];
  while (grid.length % 7 !== 0) grid.push(null);
  const weeks = Array.from({ length: grid.length / 7 }, (_, index) =>
    grid.slice(index * 7, index * 7 + 7),
  );

  return (
    <div className={cn("rounded-lg border border-border-subtle p-3", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          variant="icon"
          size="sm"
          aria-label="Mês anterior"
          onClick={() => onMonthChange(addIsoMonths(month, -1))}
        >
          <ChevronLeft size={18} />
        </Button>
        <strong aria-live="polite" className="text-sm font-bold">
          {monthTitle(month)}
        </strong>
        <Button
          variant="icon"
          size="sm"
          aria-label="Próximo mês"
          onClick={() => onMonthChange(addIsoMonths(month, 1))}
        >
          <ChevronRight size={18} />
        </Button>
      </div>

      {loading ? (
        <LoadingRegion label="Carregando calendário">
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }, (_, index) => (
              <Skeleton key={index} className="h-12" />
            ))}
          </div>
        </LoadingRegion>
      ) : (
        <div role="grid" aria-label="Calendário de disponibilidade">
          <div role="row" className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((weekday) => (
              <span
                key={weekday}
                role="columnheader"
                className="pb-1 text-center text-[11px] font-bold uppercase text-text-secondary"
              >
                {weekday}
              </span>
            ))}
          </div>
          {weeks.map((week, index) => (
            <div key={index} role="row" className="grid grid-cols-7 gap-1">
              {week.map((day, position) =>
                day === null ? (
                  <span key={position} role="gridcell" />
                ) : (
                  <DayCell
                    key={day}
                    day={day}
                    summary={byDay.get(day)}
                    selected={day === selected}
                    focused={day === focused}
                    cells={cells}
                    onFocus={() => setFocused(day)}
                    onKeyDown={(event) => onKeyDown(event, day)}
                    onSelect={onSelect}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-secondary">
        <Swatch className="bg-success-surface" label="livre" />
        <Swatch className="bg-warning-surface" label="parcial" />
        <Swatch className="pattern-busy bg-surface-sunken" label="cheio" />
        <span>o número diz quantos horários livres restam</span>
      </p>
    </div>
  );
}

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        aria-hidden="true"
        className={cn("inline-block size-3 rounded-sm", className)}
      />
      {label}
    </span>
  );
}

function DayCell({
  day,
  summary,
  selected,
  focused,
  cells,
  onFocus,
  onKeyDown,
  onSelect,
}: {
  day: string;
  summary?: DaySummary;
  selected: boolean;
  focused: boolean;
  cells: React.RefObject<Map<string, HTMLButtonElement>>;
  onFocus: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onSelect: (day: string) => void;
}) {
  const open = selectable(summary);
  const state = summary?.state ?? "closed";
  return (
    <button
      ref={(node) => {
        if (node) cells.current.set(day, node);
        else cells.current.delete(day);
      }}
      type="button"
      role="gridcell"
      data-testid={`day-${day}`}
      data-state={state}
      tabIndex={focused ? 0 : -1}
      aria-selected={selected}
      aria-disabled={open ? undefined : true}
      aria-label={`${fmt(day, { day: "numeric", month: "long" })}, ${fmt(day, {
        weekday: "long",
      })}, ${describe(summary)}`}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      onClick={() => {
        if (open) onSelect(day);
      }}
      className={cn(
        "flex h-12 flex-col items-center justify-center rounded-md border text-xs",
        selected
          ? "border-2 border-action-primary-active bg-action-primary text-text-on-accent"
          : "border-transparent",
        !selected && state === "free" && "bg-success-surface text-success-text",
        !selected &&
          state === "partial" &&
          "bg-warning-surface text-warning-text",
        !selected &&
          state === "full" &&
          "pattern-busy bg-surface-sunken text-text-secondary",
        !selected &&
          (state === "past" || state === "closed") &&
          "text-text-secondary opacity-50",
        !open && "cursor-not-allowed",
      )}
    >
      <span className="text-sm font-bold">{Number(day.slice(8))}</span>
      <span className="text-[10px] leading-none">{shortLabel(summary)}</span>
    </button>
  );
}

function describe(summary?: DaySummary) {
  if (!summary || summary.state === "closed") return "fechado";
  if (summary.state === "past") return "data passada";
  if (summary.state === "full") return "lotado";
  return summary.free === 1
    ? "1 horário livre"
    : `${summary.free} horários livres`;
}

function shortLabel(summary?: DaySummary) {
  if (!summary || summary.state === "closed" || summary.state === "past")
    return "—";
  if (summary.state === "full") return "cheio";
  // A célula tem largura de dedo, não de frase. O número é o sinal; "livres"
  // por extenso está no `aria-label`, e a legenda abaixo da grade explica a cor.
  return summary.free;
}

const monthTitle = (month: string) =>
  capitalizeFirst(fmt(`${month}-01`, { month: "long", year: "numeric" }));
