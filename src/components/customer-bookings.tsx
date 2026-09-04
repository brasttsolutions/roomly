"use client";
import { useState, useTransition } from "react";
import { CalendarDays, Clock3, KeyRound, MapPin } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { cancelBookingAction } from "@/app/minhas-reservas/actions";
import type { CustomerBookingView } from "@/lib/server/customer-bookings";

const demoBooking: CustomerBookingView = {
  id: "booking_demo",
  room: "Sala Executiva",
  location: "Ágora Tech Park · 2º andar",
  date: "03/09/2026",
  time: "14:00",
  endTime: "15:00",
  status: "Confirmada",
  accessCode: "583 921",
};
const demoHistory: CustomerBookingView[] = [
  {
    id: "history_1",
    room: "Sala Foco",
    location: "Ágora Tech Park",
    date: "28/08/2026",
    time: "10:00",
    endTime: "11:00",
    status: "Concluída",
  },
  {
    id: "history_2",
    room: "Atelier Criativo",
    location: "Centro Joinville",
    date: "21/08/2026",
    time: "13:00",
    endTime: "16:00",
    status: "Concluída",
  },
];

export function CustomerBookings({
  current = demoBooking,
  history = demoHistory,
}: {
  current?: CustomerBookingView | null;
  history?: CustomerBookingView[];
}) {
  const [cancelled, setCancelled] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const booking = current === undefined ? demoBooking : current;

  if (!booking) {
    return (
      <div>
        <section className="border-y border-[#dce1dd] bg-white p-6">
          <h2 className="text-lg font-bold">Nenhuma reserva futura</h2>
          <p className="mt-2 text-sm text-[#66736d]">
            Suas próximas reservas aparecerão aqui.
          </p>
        </section>
        <h2 className="mb-4 mt-8 text-sm font-bold uppercase text-[#66736d]">
          Histórico
        </h2>
        <div className="divide-y divide-[#e1e5e2] border-y border-[#dce1dd] bg-white">
          {history.map((item) => (
            <History
              key={item.id}
              room={item.room}
              date={`${item.date} · ${item.time} – ${item.endTime}`}
            />
          ))}
        </div>
      </div>
    );
  }

  function cancel(bookingId: string) {
    startTransition(async () => {
      const result = await cancelBookingAction(bookingId);
      if (result.ok) setCancelled(true);
      else setCancelError(result.error ?? "Não foi possível cancelar.");
    });
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section>
        <h2 className="mb-4 text-sm font-bold uppercase text-[#66736d]">
          Próxima reserva
        </h2>
        <article className="rounded-lg border border-[#d8ded9] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge tone={cancelled ? "coral" : "green"}>
                {cancelled ? "Cancelada" : "Confirmada"}
              </Badge>
              <h3 className="mt-3 text-2xl font-bold">{booking.room}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-[#66736d]">
                <MapPin size={15} />
                {booking.location}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold">
                <CalendarDays size={16} />
                {booking.date}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
                <Clock3 size={16} />
                {booking.time} – {booking.endTime}
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 border-t border-[#e1e5e2] pt-5">
            <Button variant="secondary">Ver detalhes</Button>
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
              <p role="alert" className="w-full text-sm text-[#a84331]">
                {cancelError}
              </p>
            )}
          </div>
        </article>
        <h2 className="mb-4 mt-8 text-sm font-bold uppercase text-[#66736d]">
          Histórico
        </h2>
        <div className="divide-y divide-[#e1e5e2] border-y border-[#dce1dd] bg-white">
          {history.map((item) => (
            <History
              key={item.id}
              room={item.room}
              date={`${item.date} · ${item.time} – ${item.endTime}`}
            />
          ))}
        </div>
      </section>
      <aside className="rounded-lg bg-[#17211d] p-6 text-white lg:sticky lg:top-24 lg:self-start">
        <p className="flex items-center gap-2 text-sm text-white/70">
          <KeyRound size={17} />
          Código de acesso
        </p>
        {cancelled ? (
          <p className="mt-5 text-sm leading-6 text-[#f3a28e]">
            Acesso revogado. O estorno sera processado conforme a politica da
            reserva.
          </p>
        ) : (
          <>
            <p className="mt-5 font-mono text-3xl font-bold">583 921</p>
            <p className="mt-3 text-sm leading-6 text-white/65">
              Válido em 03/09, das 13:55 às 15:05.
            </p>
            <div className="mt-6 h-1.5 overflow-hidden rounded bg-white/15">
              <div className="h-full w-[72%] bg-[#68d7a8]" />
            </div>
            <p className="mt-2 text-xs text-white/50">
              Disponível 5 minutos antes do início
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
function History({ room, date }: { room: string; date: string }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div>
        <strong className="text-sm">{room}</strong>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{date}</p>
      </div>
      <Badge>Concluída</Badge>
    </div>
  );
}
