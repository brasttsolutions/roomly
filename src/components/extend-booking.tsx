"use client";
import { useState } from "react";
import Link from "next/link";
import { CalendarPlus, Loader2 } from "lucide-react";
import type { ExtensionOffer } from "@/lib/server/booking-detail";
import { formatDuration, formatMoney } from "@/lib/utils";
import { Alert } from "./ui/alert";
import { Card } from "./ui/card";

/**
 * A extensão é uma reserva nova no bloco seguinte, criada pelo mesmo endpoint,
 * com o mesmo hold e a mesma idempotência. Um caminho paralelo com regras
 * próprias seria uma segunda verdade sobre quem pode ocupar a sala.
 *
 * Um clique resolve: cada botão é uma duração com o preço à vista, e clicar já
 * estende e cobra. Não há passo de "confirmar" — o preço no botão é a
 * confirmação. Enquanto uma extensão está em curso, os botões desabilitam para
 * não comprar dois blocos.
 */
export function ExtendBooking({
  roomId,
  endAt,
  offer,
  timeZone,
}: {
  roomId: string;
  /** Fim da reserva atual: é onde a extensão começa. */
  endAt: string;
  offer: ExtensionOffer;
  timeZone: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  // Qual duração está sendo processada agora (null = nenhuma). Serve de trava
  // contra duplo clique e de indicador de qual botão gira.
  const [emCurso, setEmCurso] = useState<number | null>(null);

  const options: number[] = [];
  for (
    let minutes = offer.minMinutes;
    minutes <= offer.maxMinutes;
    minutes += 30
  ) {
    options.push(minutes);
  }

  if (options.length === 0) {
    return (
      <Alert tone="info" title="Não dá para estender esta reserva">
        {offer.reason}{" "}
        <Link href="/" className="font-semibold underline underline-offset-4">
          Ver outras salas livres
        </Link>
      </Alert>
    );
  }

  async function extend(minutes: number) {
    setEmCurso(minutes);
    setError(null);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          roomId,
          startAt: new Date(endAt).toISOString(),
          endAt: new Date(Date.parse(endAt) + minutes * 60_000).toISOString(),
          paymentMethod: "pix",
          // Chave nova por clique: a trava `emCurso` já barra o duplo clique, e
          // uma chave aleatória impede que um terceiro queime a da vítima.
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(body.error ?? "Não foi possível estender.");
      setDone(clock(Date.parse(endAt) + minutes * 60_000, timeZone));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível estender.",
      );
    } finally {
      setEmCurso(null);
    }
  }

  if (done) {
    return (
      <Alert tone="success" title="Extensão criada">
        A sala é sua até {done}. O pagamento aparece em minhas reservas.
      </Alert>
    );
  }

  return (
    <Card as="section" aria-label="Estender reserva">
      <h2 className="flex items-center gap-2 text-subheadline font-bold">
        <CalendarPlus size={17} aria-hidden="true" />
        Precisa de mais tempo?
      </h2>
      <p className="mt-2 text-subheadline text-text-secondary">{offer.reason}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const preco = Math.round((offer.priceCentsPerSlot * option) / 30);
          const girando = emCurso === option;
          return (
            <button
              key={option}
              type="button"
              disabled={emCurso !== null}
              onClick={() => void extend(option)}
              data-testid={`extend-${option}`}
              className="flex h-12 items-center justify-between gap-2 rounded-md border border-border-control px-4 text-subheadline font-semibold hover:border-action-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex items-center gap-2">
                {girando && (
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                )}
                +{formatDuration(option)}
              </span>
              <span className="font-bold">{formatMoney(preco)}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-caption text-text-secondary">
        Um toque estende e cobra pelo PIX. O acesso segue no mesmo código.
      </p>
      {error && (
        <Alert tone="danger" className="mt-3">
          {error}
        </Alert>
      )}
    </Card>
  );
}

const clock = (instant: number, timeZone: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(instant));
