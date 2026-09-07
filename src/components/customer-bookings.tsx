"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CalendarPlus,
  Clock3,
  Headphones,
  KeyRound,
  MapPin,
  Navigation,
} from "lucide-react";
import { Alert } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { EmptyState } from "./ui/empty-state";
import { cancelBookingAction } from "@/app/minhas-reservas/actions";
import { buildIcs } from "@/lib/calendar";
import { site } from "@/lib/site";
import type { CustomerBookingView } from "@/lib/server/customer-bookings";

type Aba = "upcoming" | "completed" | "cancelled";

const ACCESS_LABEL: Record<
  string,
  { text: string; tone: "success" | "warning" | "danger" | "neutral" }
> = {
  active: { text: "Acesso liberado", tone: "success" },
  pending: { text: "Acesso sendo preparado", tone: "warning" },
  revoked: { text: "Acesso revogado", tone: "neutral" },
  failed: { text: "Falha ao liberar acesso", tone: "danger" },
};

const STATUS_TONE: Record<string, "success" | "warning" | "neutral"> = {
  Confirmada: "success",
  Aguardando: "warning",
  Concluída: "neutral",
  Cancelada: "neutral",
};

export function CustomerBookings({
  upcoming,
  completed,
  cancelled,
}: {
  upcoming: CustomerBookingView[];
  completed: CustomerBookingView[];
  cancelled: CustomerBookingView[];
}) {
  const [aba, setAba] = useState<Aba>("upcoming");
  const hero = upcoming[0] ?? null;
  const restoUpcoming = upcoming.slice(1);

  const listas: Record<Aba, CustomerBookingView[]> = {
    upcoming,
    completed,
    cancelled,
  };

  return (
    <div className="grid gap-8">
      <section aria-label="Próxima reserva">
        <h2 className="mb-4 text-subheadline font-bold uppercase text-text-secondary">
          Próxima reserva
        </h2>
        {hero ? (
          <HeroCard booking={hero} />
        ) : (
          <EmptyState
            title="Nenhuma reserva futura"
            description="Escolha uma sala e um horário para ver sua reserva aqui."
            action={
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-md bg-action-primary px-5 text-subheadline font-bold text-text-on-accent"
              >
                Ver salas
              </Link>
            }
          />
        )}
      </section>

      <section aria-label="Minhas reservas">
        <div
          role="tablist"
          aria-label="Filtrar reservas"
          className="mb-4 flex gap-1 border-b border-border-subtle"
        >
          <Tab atual={aba} valor="upcoming" onSelect={setAba} contagem={upcoming.length}>
            Próximas
          </Tab>
          <Tab atual={aba} valor="completed" onSelect={setAba} contagem={completed.length}>
            Concluídas
          </Tab>
          <Tab atual={aba} valor="cancelled" onSelect={setAba} contagem={cancelled.length}>
            Canceladas
          </Tab>
        </div>

        <div role="tabpanel">
          {aba === "upcoming" && restoUpcoming.length === 0 && hero ? (
            <p className="text-subheadline text-text-secondary">
              Esta é a sua única reserva futura.
            </p>
          ) : listas[aba].length === 0 ? (
            <p className="text-subheadline text-text-secondary">
              {aba === "upcoming"
                ? "Você não tem reservas futuras."
                : aba === "completed"
                  ? "Nenhuma reserva concluída ainda."
                  : "Nenhuma reserva cancelada."}
            </p>
          ) : (
            <Card padding="none" className="divide-y divide-border-subtle">
              {(aba === "upcoming" ? restoUpcoming : listas[aba]).map((item) => (
                <Link
                  key={item.id}
                  href={`/minhas-reservas/${item.id}`}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-surface-page"
                >
                  <div>
                    <strong className="text-subheadline">{item.room}</strong>
                    <p className="mt-1 text-caption text-text-secondary">
                      {[item.coworking, item.location].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-0.5 text-caption text-text-secondary">
                      {item.date} · {item.time} – {item.endTime}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[item.status]}>{item.status}</Badge>
                </Link>
              ))}
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

function Tab({
  children,
  valor,
  atual,
  onSelect,
  contagem,
}: {
  children: React.ReactNode;
  valor: Aba;
  atual: Aba;
  onSelect: (a: Aba) => void;
  contagem: number;
}) {
  const ativa = atual === valor;
  return (
    <button
      role="tab"
      aria-selected={ativa}
      onClick={() => onSelect(valor)}
      className={`-mb-px border-b-2 px-4 py-2.5 text-subheadline font-semibold ${
        ativa
          ? "border-action-primary text-text-primary"
          : "border-transparent text-text-secondary hover:text-text-primary"
      }`}
    >
      {children}
      <span className="ml-1.5 text-caption text-text-secondary">{contagem}</span>
    </button>
  );
}

function HeroCard({ booking }: { booking: CustomerBookingView }) {
  const [erro, setErro] = useState<string | null>(null);
  const [cancelado, setCancelado] = useState(false);
  const [pending, startTransition] = useTransition();

  function cancelar() {
    setErro(null);
    startTransition(async () => {
      const result = await cancelBookingAction(booking.id);
      // Feedback imediato na própria reserva: ela some do topo na próxima
      // navegação, quando o servidor recategoriza para "Canceladas".
      if (result.ok) setCancelado(true);
      else setErro(result.error ?? "Não foi possível cancelar.");
    });
  }

  const mapsHref = booking.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${booking.coworking} ${booking.address}`.trim(),
      )}`
    : null;

  const suporteHref = `mailto:${site.contactEmail}?subject=${encodeURIComponent(
    `Suporte — reserva ${booking.id}`,
  )}`;

  function baixarCalendario() {
    const ics = buildIcs({
      uid: booking.id,
      title: `Reserva ${booking.room}${booking.coworking ? ` · ${booking.coworking}` : ""}`,
      startAtIso: booking.startAtIso,
      endAtIso: booking.endAtIso,
      location: [booking.location, booking.address].filter(Boolean).join(" · "),
      description: "Reserva feita pelo Roomly. Acesso liberado no horário.",
    });
    const url = URL.createObjectURL(
      new Blob([ics], { type: "text/calendar;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `reserva-${booking.room.toLowerCase().replace(/\s+/g, "-")}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={cancelado ? "neutral" : STATUS_TONE[booking.status]}>
              {cancelado ? "Cancelada" : booking.status}
            </Badge>
            <AccessBadge status={cancelado ? "revoked" : booking.accessStatus} />
          </div>
          <h3 className="mt-3 text-title2 font-bold">{booking.room}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-subheadline text-text-secondary">
            <MapPin size={15} aria-hidden="true" />
            {[booking.coworking, booking.location].filter(Boolean).join(" · ") ||
              "Unidade a confirmar"}
          </p>
        </div>
        <div>
          <p className="flex items-center gap-2 text-subheadline font-semibold">
            <CalendarDays size={16} aria-hidden="true" />
            {booking.date}
          </p>
          <p className="mt-2 flex items-center gap-2 text-subheadline font-semibold tabular-nums">
            <Clock3 size={16} aria-hidden="true" />
            {booking.time} – {booking.endTime}
          </p>
        </div>
      </div>

      {/* Estado do acesso, não o código cheio: o número da fechadura nunca chega
          ao app por design, então mostramos a janela e o fingerprint. */}
      {!cancelado && <CredentialBlock booking={booking} />}

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-5">
        <Link
          href={`/minhas-reservas/${booking.id}`}
          data-testid="booking-detail-link"
          className="inline-flex h-11 items-center justify-center rounded-md border border-border-control px-4 text-subheadline font-semibold hover:bg-surface-page"
        >
          Ver acesso e detalhes
        </Link>
        {mapsHref && (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-md border border-border-control px-4 text-subheadline font-semibold hover:bg-surface-page"
          >
            <Navigation size={16} aria-hidden="true" />
            Como chegar
          </a>
        )}
        <Link
          href={`/minhas-reservas/${booking.id}`}
          className="inline-flex h-11 items-center gap-2 rounded-md border border-border-control px-4 text-subheadline font-semibold hover:bg-surface-page"
        >
          Estender
        </Link>
        <button
          type="button"
          onClick={baixarCalendario}
          className="inline-flex h-11 items-center gap-2 rounded-md border border-border-control px-4 text-subheadline font-semibold hover:bg-surface-page"
        >
          <CalendarPlus size={16} aria-hidden="true" />
          Adicionar ao calendário
        </button>
        <a
          href={suporteHref}
          className="inline-flex h-11 items-center gap-2 rounded-md border border-border-control px-4 text-subheadline font-semibold hover:bg-surface-page"
        >
          <Headphones size={16} aria-hidden="true" />
          Suporte
        </a>
        {!cancelado && (
          <Button variant="ghost" onClick={cancelar} disabled={pending}>
            {pending ? "Cancelando..." : "Cancelar reserva"}
          </Button>
        )}
      </div>
      {erro && (
        <Alert tone="danger" className="mt-3">
          {erro}
        </Alert>
      )}
    </Card>
  );
}

function CredentialBlock({ booking }: { booking: CustomerBookingView }) {
  const janela =
    booking.validFrom && booking.validUntil
      ? `Válido das ${hhmm(booking.validFrom, booking.timeZone)} às ${hhmm(
          booking.validUntil,
          booking.timeZone,
        )}`
      : null;
  return (
    <div className="mt-5 rounded-md bg-surface-inverse p-5 text-text-inverse">
      <p className="flex items-center gap-2 text-subheadline opacity-70">
        <KeyRound size={17} aria-hidden="true" />
        Código de acesso
      </p>
      {booking.accessStatus === "active" ? (
        <p className="mt-3 text-subheadline leading-6">
          Acesso liberado.{janela ? ` ${janela}.` : ""} O código fica na ficha da
          reserva e na fechadura, no horário.
        </p>
      ) : booking.accessStatus === "failed" ? (
        <p className="mt-3 text-subheadline leading-6">
          Houve uma falha ao liberar o acesso. Fale com o suporte para resolver
          antes do horário.
        </p>
      ) : (
        <p className="mt-3 text-subheadline leading-6">
          {janela
            ? `${janela}. O código é liberado automaticamente na fechadura.`
            : "O código é liberado automaticamente cinco minutos antes do início."}
        </p>
      )}
    </div>
  );
}

function hhmm(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function AccessBadge({
  status,
}: {
  status: CustomerBookingView["accessStatus"];
}) {
  if (!status) return null;
  const label = ACCESS_LABEL[status];
  if (!label) return null;
  return <Badge tone={label.tone}>{label.text}</Badge>;
}
