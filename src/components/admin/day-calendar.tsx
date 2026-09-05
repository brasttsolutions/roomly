import type { DayCalendar } from "@/lib/server/admin-views";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  awaiting_payment: "bg-warning-surface text-warning-text border-warning-border",
  confirmed: "bg-success-surface text-success-text border-success-border",
  in_progress: "bg-info-surface text-info-text border-info-border",
  completed: "bg-surface-sunken text-text-secondary border-border-subtle",
};

/**
 * Grade de ocupação: uma coluna por sala, uma faixa por reserva. Uma tabela de
 * linhas não mostra o buraco de duas horas entre duas reservas — e o buraco é
 * justamente o que a operação precisa enxergar.
 */
export function DayCalendarGrid({ calendar }: { calendar: DayCalendar }) {
  const { openingMinutes: open, closingMinutes: close } = calendar;
  const span = Math.max(60, close - open);
  const hours = Array.from(
    { length: Math.floor(span / 60) + 1 },
    (_, index) => open + index * 60,
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-raised">
      <div className="min-w-[720px]">
        <div
          className="grid border-b border-border-subtle"
          style={{
            gridTemplateColumns: `72px repeat(${calendar.rooms.length}, minmax(0,1fr))`,
          }}
        >
          <span className="p-3 text-caption font-bold uppercase text-text-secondary">
            Hora
          </span>
          {calendar.rooms.map((room) => (
            <span key={room.id} className="p-3">
              <strong className="block text-subheadline">{room.name}</strong>
              <span className="text-caption text-text-secondary">{room.unit}</span>
            </span>
          ))}
        </div>

        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `72px repeat(${calendar.rooms.length}, minmax(0,1fr))`,
            height: `${span * 1.1}px`,
          }}
        >
          <div className="relative border-r border-border-subtle">
            {hours.map((minute) => (
              <span
                key={minute}
                className="absolute left-0 w-full pl-3 text-caption tabular-nums text-text-secondary"
                style={{ top: `${(minute - open) * 1.1}px` }}
              >
                {label(minute)}
              </span>
            ))}
          </div>

          {calendar.rooms.map((room) => (
            <div
              key={room.id}
              className="relative border-r border-border-subtle last:border-r-0"
            >
              {hours.map((minute) => (
                <span
                  key={minute}
                  aria-hidden="true"
                  className="absolute left-0 h-px w-full bg-border-subtle"
                  style={{ top: `${(minute - open) * 1.1}px` }}
                />
              ))}
              {calendar.bookings
                .filter((booking) => booking.roomId === room.id)
                .map((booking) => (
                  <article
                    key={booking.id}
                    className={cn(
                      "absolute inset-x-1 overflow-hidden rounded-md border px-2 py-1",
                      TONE[booking.status] ?? TONE.completed,
                    )}
                    style={{
                      top: `${(booking.startMinutes - open) * 1.1}px`,
                      height: `${Math.max(24, (booking.endMinutes - booking.startMinutes) * 1.1 - 2)}px`,
                    }}
                  >
                    <p className="truncate text-caption font-bold tabular-nums">
                      {booking.label}
                    </p>
                    <p className="truncate text-caption">{booking.customer}</p>
                  </article>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const label = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
