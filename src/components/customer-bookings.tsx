"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarDays, Clock3, MapPin } from "lucide-react";
import { Alert } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { EmptyState } from "./ui/empty-state";
import { cancelBookingAction } from "@/app/minhas-reservas/actions";
import type { CustomerBookingView } from "@/lib/server/customer-bookings";

const ACCESS_LABEL: Record<string, { text: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  active: { text: "Acesso liberado", tone: "success" },
  pending: { text: "Acesso sendo preparado", tone: "warning" },
  revoked: { text: "Acesso revogado", tone: "neutral" },
  failed: { text: "Falha ao liberar acesso", tone: "danger" },
};

export function CustomerBookings({
  current,
  history = [],
}: {
  current: CustomerBookingView | null;
  history?: CustomerBookingView[];
}) {
  const [cancelled, setCancelled] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const booking = current;

  function cancel(bookingId: string) {
    startTransition(async () => {
      const result = await cancelBookingAction(bookingId);
      if (result.ok) setCancelled(true);
      else setCancelError(result.error ?? "Não foi possível cancelar.");
    });
  }

  return (
    <div className="grid gap-8">
      <section>
        <h2 className="mb-4 text-subheadline font-bold uppercase text-text-secondary">
          Próxima reserva
        </h2>
        {booking ? (
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={cancelled ? "neutral" : "success"}>
                    {cancelled ? "Cancelada" : booking.status}
                  </Badge>
                  <AccessBadge
                    status={cancelled ? "revoked" : booking.accessStatus}
                  />
                </div>
                <h3 className="mt-3 text-title2 font-bold">{booking.room}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-subheadline text-text-secondary">
                  <MapPin size={15} aria-hidden="true" />
                  {booking.location}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-2 text-subheadline font-semibold">
                  <CalendarDays size={16} aria-hidden="true" />
                  {booking.date}
                </p>
                <p className="mt-2 flex items-center gap-2 text-subheadline font-semibold">
                  <Clock3 size={16} aria-hidden="true" />
                  {booking.time} – {booking.endTime}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-5">
              {/* O código de acesso vive só na página da reserva, com sessão
                  ativa — nunca numa listagem que cabe numa captura de tela. */}
              <Link
                href={`/minhas-reservas/${booking.id}`}
                data-testid="booking-detail-link"
                className="inline-flex h-11 items-center justify-center rounded-md border border-border-control px-4 text-subheadline font-semibold hover:bg-surface-page"
              >
                Ver acesso e detalhes
              </Link>
              {!cancelled && (
                <Button
                  variant="ghost"
                  onClick={() => cancel(booking.id)}
                  disabled={pending}
                >
                  {pending ? "Cancelando..." : "Cancelar reserva"}
                </Button>
              )}
              {cancelError && (
                <Alert tone="danger" className="w-full">
                  {cancelError}
                </Alert>
              )}
            </div>
          </Card>
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

      <section>
        <h2 className="mb-4 text-subheadline font-bold uppercase text-text-secondary">
          Histórico
        </h2>
        {history.length === 0 ? (
          <Card className="text-subheadline text-text-secondary">
            Suas reservas anteriores aparecem aqui.
          </Card>
        ) : (
          <Card padding="none" className="divide-y divide-border-subtle">
            {history.map((item) => (
              <Link
                key={item.id}
                href={`/minhas-reservas/${item.id}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-surface-page"
              >
                <div>
                  <strong className="text-subheadline">{item.room}</strong>
                  <p className="mt-1 text-caption text-text-secondary">
                    {item.date} · {item.time} – {item.endTime}
                  </p>
                </div>
                <Badge>{item.status}</Badge>
              </Link>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
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
