"use client";
import { SprayCan } from "lucide-react";
import type { AvailabilityBlock } from "@/modules/availability/domain";
import { Skeleton, LoadingRegion } from "./skeleton";
import { cn } from "@/lib/utils";

/**
 * Um bloco indisponível continua focável, com `aria-disabled` em vez de
 * `disabled`: quem navega por teclado precisa alcançar o bloco para ouvir por
 * que ele não serve. Bloco removido da ordem de foco some sem explicação.
 */
export function TimeSlotPicker({
  blocks,
  minimumMinutes,
  selected,
  durationMinutes,
  onSelect,
  loading,
  className,
}: {
  blocks: readonly AvailabilityBlock[];
  minimumMinutes: number;
  /** Horário de início escolhido, no formato `HH:MM`. */
  selected: string | null;
  /** Duração escolhida, para pintar os blocos cobertos pela reserva. */
  durationMinutes: number;
  onSelect: (block: AvailabilityBlock) => void;
  loading?: boolean;
  className?: string;
}) {
  if (loading) {
    return (
      <LoadingRegion label="Carregando horários">
        <div className={cn("grid grid-cols-3 gap-2 sm:grid-cols-4", className)}>
          {Array.from({ length: 12 }, (_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      </LoadingRegion>
    );
  }

  const start = selected ? blocks.findIndex((b) => b.time === selected) : -1;
  const covered =
    start >= 0 && blocks.length > 0
      ? new Set(
          blocks
            .slice(start, start + Math.ceil(durationMinutes / slotOf(blocks)))
            .map((block) => block.time),
        )
      : new Set<string>();

  return (
    <div
      role="group"
      aria-label="Horários disponíveis"
      className={cn("grid grid-cols-3 gap-2 sm:grid-cols-4", className)}
    >
      {blocks.map((block) => {
        const bookable =
          block.state === "available" &&
          block.maxDurationMinutes >= minimumMinutes;
        const isSelected = block.time === selected;
        const inRange = !isSelected && covered.has(block.time);
        return (
          <button
            key={block.time}
            type="button"
            data-testid={`slot-${block.time}`}
            data-state={block.state}
            aria-pressed={isSelected}
            aria-disabled={bookable ? undefined : true}
            aria-label={
              bookable
                ? `${block.time}, disponível`
                : `${block.time}, indisponível, ${block.reason.toLowerCase()}`
            }
            title={bookable ? undefined : block.reason}
            onClick={() => {
              if (bookable) onSelect(block);
            }}
            className={cn(
              "flex h-12 items-center justify-center gap-1 rounded-md border text-subheadline font-semibold",
              "transition-colors",
              isSelected &&
                "border-2 border-action-primary-active bg-action-primary text-text-on-accent",
              inRange &&
                "border-transparent bg-surface-accent-subtle text-text-primary",
              !isSelected &&
                !inRange &&
                bookable &&
                "border-border-control bg-surface-raised text-text-primary hover:border-action-primary",
              block.state === "cleaning" &&
                "cursor-not-allowed border-warning-border bg-warning-surface text-warning-text",
              block.state === "past" &&
                "cursor-not-allowed border-border-subtle bg-surface-raised text-text-secondary opacity-40",
              block.state === "booked" &&
                "cursor-not-allowed border-transparent bg-surface-sunken text-text-secondary line-through",
              // Livre, mas curto demais para a duração mínima. Não é riscado:
              // riscar diria "reservado", e o bloco não está reservado.
              block.state === "available" &&
                !bookable &&
                "cursor-not-allowed border-border-subtle bg-surface-raised text-text-secondary",
            )}
          >
            {block.state === "cleaning" && (
              <SprayCan size={14} aria-hidden="true" />
            )}
            {block.time}
          </button>
        );
      })}
    </div>
  );
}

/** Duração de um bloco, medida no primeiro deles. */
function slotOf(blocks: readonly AvailabilityBlock[]) {
  const first = blocks[0];
  if (!first) return 30;
  return (Date.parse(first.endAt) - Date.parse(first.startAt)) / 60_000;
}
