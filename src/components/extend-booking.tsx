"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import type { ExtensionOffer } from "@/lib/server/booking-detail";
import { formatDuration, formatMoney } from "@/lib/utils";
import { Alert } from "./ui/alert";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

/**
 * A extensão é uma reserva nova no bloco seguinte, criada pelo mesmo endpoint,
 * com o mesmo hold e a mesma idempotência. Um caminho paralelo com regras
 * próprias seria uma segunda verdade sobre quem pode ocupar a sala.
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  // Chave de idempotência aleatória, fixada na primeira tentativa desta tela.
  // A anterior era `extend:<bookingId>:<duração>` — adivinhável a partir do id
  // da reserva. Isso deixava um terceiro "queimar" a chave da vítima (o índice
  // único é permanente, então a extensão dela passava a falhar para sempre), e
  // fazia uma segunda extensão legítima colidir com a primeira. Estável por
  // montagem: dois cliques ainda compartilham a chave (não compram dois
  // blocos), e uma nova extensão, feita depois, recarrega a tela e ganha outra.
  const idempotencyKey = useRef<string | null>(null);

  const options: number[] = [];
  for (
    let minutes = offer.minMinutes;
    minutes <= offer.maxMinutes;
    minutes += 30
  ) {
    options.push(minutes);
  }
  const [minutes, setMinutes] = useState(options[0] ?? 0);
  const chosen = options.includes(minutes) ? minutes : (options[0] ?? 0);

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

  const price = Math.round((offer.priceCentsPerSlot * chosen) / 30);
  const until = clock(Date.parse(endAt) + chosen * 60_000, timeZone);

  async function extend() {
    setSubmitting(true);
    setError(null);
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          roomId,
          startAt: new Date(endAt).toISOString(),
          endAt: new Date(Date.parse(endAt) + chosen * 60_000).toISOString(),
          paymentMethod: "pix",
          idempotencyKey: idempotencyKey.current,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(body.error ?? "Não foi possível estender.");
      setDone(until);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível estender.",
      );
    } finally {
      setSubmitting(false);
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
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === chosen}
            onClick={() => setMinutes(option)}
            className={
              option === chosen
                ? "h-11 rounded-md border-2 border-action-primary-active bg-action-primary px-4 text-subheadline font-bold text-text-on-accent"
                : "h-11 rounded-md border border-border-control px-4 text-subheadline font-semibold hover:border-action-primary"
            }
          >
            +{formatDuration(option)}
          </button>
        ))}
      </div>
      <Button
        className="mt-4 w-full"
        loading={submitting}
        onClick={() => void extend()}
        data-testid="extend-booking"
      >
        {submitting
          ? "Estendendo..."
          : `Estender até ${until} por ${formatMoney(price)}`}
      </Button>
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
