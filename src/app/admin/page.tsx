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
import { adminDashboard } from "@/lib/server/admin-dashboard";
import { capitalizeFirst, formatIsoDay } from "@/lib/utils";

export const metadata: Metadata = { title: "Visão geral" };
export const dynamic = "force-dynamic";

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
      <section
        aria-labelledby="pendencias"
        className="rounded-lg border border-border-subtle bg-surface-raised"
      >
        <div className="flex items-center justify-between border-b border-border-subtle p-5">
          <h2 id="pendencias" className="font-bold">
            Precisa de atenção
          </h2>
          <Badge tone={data.pendencies.length > 0 ? "warning" : "success"}>
            {data.pendencies.length === 0
              ? "Nada pendente"
              : `${data.pendencies.length} ${data.pendencies.length === 1 ? "item" : "itens"}`}
          </Badge>
        </div>
        {data.pendencies.length === 0 ? (
          <p className="flex items-center gap-2 p-5 text-subheadline text-text-secondary">
            <CircleCheck size={17} className="text-success-text" aria-hidden="true" />
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
                    <strong className="block text-subheadline">{item.title}</strong>
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
      </section>

      <section className="mt-6 grid gap-px overflow-hidden rounded-lg border border-border-subtle bg-border-subtle sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((metric) => (
          <div key={metric.label} className="bg-surface-raised p-5">
            <p className="text-caption font-bold uppercase text-text-secondary">
              {metric.label}
            </p>
            <strong className="mt-3 block text-title2 tabular-nums">
              {metric.value}
            </strong>
            <p className="mt-1 text-caption text-text-secondary">{metric.hint}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <section className="rounded-lg border border-border-subtle bg-surface-raised">
          <div className="flex items-center justify-between border-b border-border-subtle p-5">
            <div>
              <h2 className="font-bold">Ocupação da semana</h2>
              <p className="mt-1 text-caption text-text-secondary">
                Horas reservadas por dia, últimos sete dias
              </p>
            </div>
          </div>
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
        </section>
        <section className="rounded-lg border border-border-subtle bg-surface-raised">
          <div className="border-b border-border-subtle p-5">
            <h2 className="font-bold">Saúde da operação</h2>
          </div>
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
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-lg border border-border-subtle bg-surface-raised">
        <div className="flex items-center justify-between border-b border-border-subtle p-5">
          <div>
            <h2 className="font-bold">Reservas de hoje</h2>
            <p className="mt-1 text-caption text-text-secondary">
              {data.bookings.length}{" "}
              {data.bookings.length === 1 ? "reserva" : "reservas"} ·{" "}
              {data.bookedHoursToday.toFixed(1).replace(".", ",")} horas
            </p>
          </div>
          <Link
            href="/admin/calendario"
            className="inline-flex items-center gap-1 text-subheadline font-bold text-text-link"
          >
            Ver calendário
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {data.bookings.length === 0 ? (
          <p className="p-5 text-subheadline text-text-secondary">
            Nenhuma reserva para hoje{data.unit ? ` em ${data.unit}` : ""}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-subheadline">
              <thead className="bg-surface-page text-caption uppercase text-text-secondary">
                <tr>
                  <th className="px-5 py-3">Horário</th>
                  <th className="px-5 py-3">Sala</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Duração</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {data.bookings.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-page">
                    <td className="px-5 py-4 font-bold tabular-nums">
                      {row.time} – {row.endTime}
                    </td>
                    <td className="px-5 py-4">{row.room}</td>
                    <td className="px-5 py-4">{row.customer}</td>
                    <td className="px-5 py-4 tabular-nums text-text-secondary">
                      {row.duration}
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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

/** Mesma leitura do Booking Status: confirmada é desfecho bom, em andamento é
 *  informação, aguardando pede ação. */
function statusTone(status: string) {
  if (status === "Confirmada") return "success" as const;
  if (status === "Em andamento") return "info" as const;
  if (status === "Aguardando") return "warning" as const;
  if (status === "Expirada") return "danger" as const;
  return "neutral" as const;
}

const weekdayLabel = (day: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
  }).format(new Date(`${day}T12:00:00Z`));
