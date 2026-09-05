"use client";
import { useEffect, useState } from "react";
import { MapPin, TimerReset } from "lucide-react";
import {
  capitalizeFirst,
  cn,
  formatDuration,
  formatIsoDay,
  formatIsoWeekday,
  formatMoney,
} from "@/lib/utils";
import { Button } from "./button";

/**
 * Resumo persistente do checkout. O contador de hold é a parte delicada: ele
 * cria urgência real, e urgência falsa destrói confiança — por isso só aparece
 * quando existe um hold de verdade no banco, nunca como enfeite.
 */
export function BookingSummary({
  roomName,
  unit,
  address,
  day,
  startTime,
  endTime,
  durationMinutes,
  hourlyPriceCents,
  totalCents,
  holdExpiresAt,
  onChange,
  onExpired,
  className,
}: {
  roomName: string;
  unit: string;
  address?: string;
  day: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  hourlyPriceCents: number;
  totalCents: number;
  /** Instante ISO em que o hold vence. Ausente enquanto não há hold. */
  holdExpiresAt?: string | null;
  onChange?: () => void;
  onExpired?: () => void;
  className?: string;
}) {
  return (
    <section
      aria-label="Resumo da reserva"
      className={cn(
        "rounded-lg border border-border-subtle bg-surface-page p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">{roomName}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-caption text-text-secondary">
            <MapPin size={13} aria-hidden="true" />
            {[unit, address].filter(Boolean).join(" · ")}
          </p>
        </div>
        {onChange && (
          <Button variant="link" className="text-subheadline" onClick={onChange}>
            Alterar
          </Button>
        )}
      </div>

      <p className="mt-3 text-subheadline font-semibold">
        {capitalizeFirst(formatIsoWeekday(day))},{" "}
        {formatIsoDay(day)} · {startTime} – {endTime}
      </p>

      <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3 text-subheadline">
        <span className="text-text-secondary">
          {formatDuration(durationMinutes)} × {formatMoney(hourlyPriceCents)}/h
        </span>
        <span className="tabular-nums">{formatMoney(totalCents)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-border-subtle pt-2">
        <span className="text-subheadline font-semibold">Total</span>
        <strong className="text-title3 tabular-nums">
          {formatMoney(totalCents)}
        </strong>
      </div>

      {holdExpiresAt ? (
        <HoldCountdown expiresAt={holdExpiresAt} onExpired={onExpired} />
      ) : (
        <p className="mt-3 text-caption text-text-secondary">
          O horário fica reservado por 10 minutos assim que o pagamento começa.
        </p>
      )}
    </section>
  );
}

function HoldCountdown({
  expiresAt,
  onExpired,
}: {
  expiresAt: string;
  onExpired?: () => void;
}) {
  const [remaining, setRemaining] = useState(() => secondsUntil(expiresAt));

  useEffect(() => {
    // O setState acontece dentro do intervalo, nunca no corpo do efeito: o
    // relógio é um sistema externo, e é ele quem dita a atualização.
    const timer = setInterval(() => {
      const next = secondsUntil(expiresAt);
      setRemaining(next);
      if (next <= 0) {
        clearInterval(timer);
        onExpired?.();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, onExpired]);

  if (remaining <= 0) {
    return (
      <p
        role="alert"
        className="mt-3 flex items-center gap-2 text-subheadline font-semibold text-danger-text"
      >
        <TimerReset size={16} aria-hidden="true" />O horário reservado expirou.
        Escolha outro horário.
      </p>
    );
  }

  const minutes = Math.floor(remaining / 60);
  const tone =
    remaining < 120
      ? "text-danger-text"
      : remaining < 300
        ? "text-warning-text"
        : "text-text-secondary";

  return (
    <p className={cn("mt-3 flex items-center gap-2 text-subheadline", tone)}>
      <TimerReset size={16} aria-hidden="true" />
      <span aria-hidden="true">
        Horário reservado por {String(minutes).padStart(2, "0")}:
        {String(remaining % 60).padStart(2, "0")}
      </span>
      {/* Anúncio por minuto. A cada segundo tornaria a tela inutilizável com
          leitor de tela. */}
      <span className="sr-only" aria-live="polite">
        {minutes > 0
          ? `Horário reservado por mais ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`
          : "Menos de um minuto para o horário expirar."}
      </span>
    </p>
  );
}

const secondsUntil = (iso: string) =>
  Math.max(0, Math.round((Date.parse(iso) - Date.now()) / 1000));

