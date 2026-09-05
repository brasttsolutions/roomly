import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  DoorClosed,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BookingStatus } from "@/components/ui/booking-status";
import { Card, CardHeader } from "@/components/ui/card";
import { Stat, StatGrid } from "@/components/ui/stat";
import { DataTable, type Column } from "@/components/ui/table";
import {
  adminDashboard,
  type TodayBooking,
} from "@/lib/server/admin-dashboard";
import { capitalizeFirst, formatIsoDay } from "@/lib/utils";

export const metadata: Metadata = { title: "Visão geral" };
export const dynamic = "force-dynamic";

const COLUMNS: ReadonlyArray<Column<TodayBooking>> = [
  {
    key: "time",
    header: "Horário",
    primary: true,
    cell: (row) => `${row.time} – ${row.endTime}`,
  },
  { key: "room", header: "Sala", cell: (row) => row.room },
  { key: "customer", header: "Cliente", cell: (row) => row.customer },
  {
    key: "duration",
    header: "Duração",
    numeric: true,
    cell: (row) => row.duration,
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <BookingStatus value={row.status} />,
  },
];

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ unidade?: string }>;
}) {
  const unit = (await searchParams).unidade;
  const data = await adminDashboard(unit);
  const weekPeak = Math.max(1, ...data.week.map((entry) => entry.hours));

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-subheadline font-bold text-text-link">
            {capitalizeFirst(weekdayLabel(data.day)).toUpperCase()},{" "}
            {formatIsoDay(data.day)}
          </p>
          <h1 className="mt-1 text-title1 font-bold">Visão geral</h1>
          <p className="mt-2 text-subheadline text-text-secondary">
            {data.unit
              ? `Operação de ${data.unit}.`
              : "A operação de hoje em um só lugar."}
          </p>
        </div>
        {/* Formulário GET: o filtro entra na URL, então a página compartilhada
            mostra a mesma unidade para quem receber o link. */}
        <form className="flex items-center gap-2">
          <label className="text-subheadline">
            <span className="sr-only">Unidade</span>
            <select
              name="unidade"
              aria-label="Unidade"
              defaultValue={data.unit ?? ""}
              className="h-11 rounded-md border border-border-control bg-surface-raised px-3 text-subheadline font-semibold"
            >
              <option value="">Todas as unidades</option>
              {data.units.map((location) => (
                <option key={location.id} value={location.name}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-11 rounded-md border border-border-control px-4 text-subheadline font-semibold hover:bg-surface-page"
          >
            Aplicar
          </button>
        </form>
      </div>

      {/* Pendência antes de métrica: uma sala suja às 11h importa mais do que a
          receita do mês. */}
      <section aria-labelledby="pendencias">
        <Card padding="none">
          <CardHeader
            id="pendencias"
            title="Precisa de atenção"
            action={
              <Badge tone={data.pendencies.length > 0 ? "warning" : "success"}>
                {data.pendencies.length === 0
                  ? "Nada pendente"
                  : `${data.pendencies.length} ${data.pendencies.length === 1 ? "item" : "itens"}`}
              </Badge>
            }
          />
          {data.pendencies.length === 0 ? (
            <p className="flex items-center gap-2 p-5 text-subheadline text-text-secondary">
              <CircleCheck
                size={17}
                className="text-success-text"
                aria-hidden="true"
              />
              Nenhuma limpeza atrasada, fechadura fora do ar ou acesso pendente.
            </p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {data.pendencies.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 p-4 hover:bg-surface-page"
                  >
                    <span
                      aria-hidden="true"
                      className={
                        item.severity === "danger"
                          ? "text-danger-text"
                          : "text-warning-text"
                      }
                    >
                      {item.severity === "danger" ? (
                        <CircleAlert size={18} />
                      ) : (
                        <TriangleAlert size={18} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-subheadline">
                        {item.title}
                      </strong>
                      <span className="block text-caption text-text-secondary">
                        {item.detail}
                      </span>
                    </span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <StatGrid className="mt-6">
        {data.metrics.map((metric) => (
          <Stat
            key={metric.label}
            label={metric.label}
            value={metric.value}
            hint={metric.hint}
          />
        ))}
      </StatGrid>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <Card padding="none">
          <CardHeader
            title="Ocupação da semana"
            hint="Horas reservadas por dia, últimos sete dias"
          />
          <div className="flex h-64 items-end gap-3 p-6">
            {data.week.map((entry) => (
              <div
                key={entry.day}
                className="flex h-full flex-1 flex-col justify-end gap-2"
              >
                <div className="relative flex-1">
                  <div
                    className="absolute bottom-0 w-full rounded-t bg-action-primary"
                    style={{ height: `${(entry.hours / weekPeak) * 100}%` }}
                  />
                </div>
                <span className="text-center text-caption font-bold tabular-nums text-text-secondary">
                  {entry.hours.toFixed(1).replace(".", ",")}
                </span>
                <span className="text-center text-caption font-bold text-text-secondary">
                  {entry.label}
                </span>
              </div>
            ))}
          </div>
        </Card>
        <Card padding="none">
          <CardHeader title="Saúde da operação" />
          <div className="divide-y divide-border-subtle">
            <Health
              icon={<DoorClosed size={18} />}
              title="Fechaduras online"
              value={data.locksOnline}
            />
            <Health
              icon={<CalendarDays size={18} />}
              title="Próxima limpeza"
              value={data.nextCleaning ?? "Nenhuma agendada"}
            />
          </div>
        </Card>
      </div>

      <Card padding="none" className="mt-6 overflow-hidden">
        <CardHeader
          title="Reservas de hoje"
          hint={`${data.bookings.length} ${
            data.bookings.length === 1 ? "reserva" : "reservas"
          } · ${data.bookedHoursToday.toFixed(1).replace(".", ",")} horas`}
          action={
            <Link
              href="/admin/calendario"
              className="inline-flex items-center gap-1 text-subheadline font-bold text-text-link"
            >
              Ver calendário
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          }
        />
        <DataTable
          caption="Reservas de hoje, por horário"
          columns={COLUMNS}
          rows={data.bookings}
          rowKey={(row) => row.id}
          empty={
            <p className="p-5 text-subheadline text-text-secondary">
              Nenhuma reserva para hoje{data.unit ? ` em ${data.unit}` : ""}.
            </p>
          }
        />
      </Card>
    </>
  );
}

function Health({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-5">
      <span
        aria-hidden="true"
        className="grid size-10 place-items-center rounded-md bg-surface-page"
      >
        {icon}
      </span>
      <p className="flex-1 text-subheadline font-semibold">{title}</p>
      <Badge>{value}</Badge>
    </div>
  );
}

const weekdayLabel = (day: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
  }).format(new Date(`${day}T12:00:00Z`));
