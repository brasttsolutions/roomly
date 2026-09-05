import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { adminSections, type AdminSection } from "@/lib/admin-sections";
import { adminRows, adminResourceOptions } from "@/lib/server/admin-data";
import {
  cleaningQueue,
  dayCalendar,
  effectivePolicies,
  monthReport,
} from "@/lib/server/admin-views";
import { CleaningQueue } from "@/components/admin/cleaning-queue";
import { DayCalendarGrid } from "@/components/admin/day-calendar";
import {
  AdminCreateDialog,
  AdminEditDialog,
} from "@/components/admin/admin-create-dialog";
import type { AdminResource } from "@/lib/admin-sections";
import { capitalizeFirst, formatIsoDay, isoDay } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  if (!(section in adminSections)) return { title: "Administração" };
  return { title: adminSections[section as AdminSection].title };
}
export function generateStaticParams() {
  return Object.keys(adminSections).map((section) => ({ section }));
}

export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ q?: string; dia?: string; mes?: string }>;
}) {
  const { section } = await params;
  if (!(section in adminSections)) notFound();
  const search = await searchParams;
  const data = adminSections[section as AdminSection];

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-text-link">OPERAÇÃO</p>
          <h1 className="mt-1 text-3xl font-bold">{data.title}</h1>
          <p className="mt-2 text-sm text-text-secondary">{data.subtitle}</p>
        </div>
        <CreateAction section={section} label={data.action} />
      </div>
      {section === "limpeza" ? (
        <CleaningQueue tasks={await cleaningQueue()} />
      ) : section === "calendario" ? (
        <CalendarBody day={search.dia ?? isoDay()} />
      ) : section === "relatorios" ? (
        <ReportBody month={search.mes ?? isoDay().slice(0, 7)} />
      ) : section === "configuracoes" ? (
        <PolicyBody />
      ) : (
        <RecordTable section={section as AdminSection} query={search.q ?? ""} />
      )}
    </>
  );
}

async function CreateAction({
  section,
  label,
}: {
  section: string;
  label: string;
}) {
  if (!["unidades", "salas", "fechaduras", "clientes"].includes(section))
    return null;
  const options = await adminResourceOptions();
  return (
    <AdminCreateDialog
      section={section as "unidades" | "salas" | "fechaduras" | "clientes"}
      label={label}
      locations={options.locations}
      rooms={options.rooms}
    />
  );
}

async function CalendarBody({ day }: { day: string }) {
  const calendar = await dayCalendar(day);
  return (
    <>
      <form className="mb-5 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-bold uppercase text-text-secondary">
            Dia
          </span>
          <input
            type="date"
            name="dia"
            defaultValue={day}
            className="h-11 rounded-md border border-border-control bg-surface-raised px-3 text-sm font-semibold"
          />
        </label>
        <button
          type="submit"
          className="h-11 rounded-md border border-border-control px-4 text-sm font-semibold hover:bg-surface-page"
        >
          Ver dia
        </button>
        <p className="ml-auto text-sm text-text-secondary">
          {capitalizeFirst(weekday(day))}, {formatIsoDay(day)} ·{" "}
          {calendar.bookings.length}{" "}
          {calendar.bookings.length === 1 ? "reserva" : "reservas"}
        </p>
      </form>
      <DayCalendarGrid calendar={calendar} />
    </>
  );
}

async function ReportBody({ month }: { month: string }) {
  const report = await monthReport(month);
  return (
    <>
      <form className="mb-5 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-bold uppercase text-text-secondary">
            Mês
          </span>
          <input
            type="month"
            name="mes"
            defaultValue={month}
            className="h-11 rounded-md border border-border-control bg-surface-raised px-3 text-sm font-semibold"
          />
        </label>
        <button
          type="submit"
          className="h-11 rounded-md border border-border-control px-4 text-sm font-semibold hover:bg-surface-page"
        >
          Ver mês
        </button>
      </form>

      <section className="mb-5 grid gap-px overflow-hidden rounded-lg border border-border-subtle bg-border-subtle sm:grid-cols-2 xl:grid-cols-4">
        <Total label="Reservas" value={String(report.totals.bookings)} />
        <Total label="Horas vendidas" value={hours(report.totals.hours)} />
        <Total label="Receita" value={money(report.totals.revenueCents)} />
        <Total label="Ocupação média" value={`${report.totals.occupancy}%`} />
      </section>

      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-raised">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-surface-page text-[11px] uppercase text-text-secondary">
            <tr>
              <th className="px-5 py-3 font-bold">Sala</th>
              <th className="px-5 py-3 font-bold">Unidade</th>
              <th className="px-5 py-3 font-bold">Reservas</th>
              <th className="px-5 py-3 font-bold">Horas</th>
              <th className="px-5 py-3 font-bold">Ocupação</th>
              <th className="px-5 py-3 font-bold">Receita</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {report.rooms.map((room) => (
              <tr key={`${room.unit}-${room.room}`} className="hover:bg-surface-page">
                <td className="px-5 py-4 font-bold">{room.room}</td>
                <td className="px-5 py-4 text-text-secondary">{room.unit}</td>
                <td className="px-5 py-4 tabular-nums">{room.bookings}</td>
                <td className="px-5 py-4 tabular-nums">{hours(room.hours)}</td>
                <td className="px-5 py-4">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-sunken"
                    >
                      <span
                        className="block h-full bg-action-primary"
                        style={{ width: `${Math.min(100, room.occupancy)}%` }}
                      />
                    </span>
                    <span className="tabular-nums">{room.occupancy}%</span>
                  </span>
                </td>
                <td className="px-5 py-4 tabular-nums">
                  {money(room.revenueCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {report.rooms.length === 0 && (
        <p className="mt-4 text-sm text-text-secondary">
          Nenhuma sala ativa no período.
        </p>
      )}
    </>
  );
}

async function PolicyBody() {
  const policies = await effectivePolicies();
  return (
    <>
      <p className="mb-5 max-w-prose text-sm text-text-secondary">
        Estas são as regras em vigor, lidas de onde o sistema realmente as
        aplica. Cada uma é editada no seu próprio lugar — guardar uma cópia aqui
        criaria duas verdades sobre a mesma regra.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-raised">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface-page text-[11px] uppercase text-text-secondary">
            <tr>
              <th className="px-5 py-3 font-bold">Política</th>
              <th className="px-5 py-3 font-bold">Valor em vigor</th>
              <th className="px-5 py-3 font-bold">Escopo</th>
              <th className="px-5 py-3 text-right font-bold">Onde muda</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {policies.map((policy) => (
              <tr
                key={`${policy.name}-${policy.scope}`}
                className="hover:bg-surface-page"
              >
                <td className="px-5 py-4 font-bold">{policy.name}</td>
                <td className="px-5 py-4">{policy.value}</td>
                <td className="px-5 py-4 text-text-secondary">
                  {policy.scope}
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    href={policy.href}
                    className="inline-flex items-center gap-1 text-sm font-bold text-text-link"
                  >
                    Abrir
                    <ChevronRight size={15} aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

async function RecordTable({
  section,
  query,
}: {
  section: AdminSection;
  query: string;
}) {
  const data = adminSections[section];
  const allRows = await adminRows(section);
  const rows = query
    ? allRows.filter((row) =>
        row.cells.some((cell) =>
          cell
            .toLocaleLowerCase("pt-BR")
            .includes(query.toLocaleLowerCase("pt-BR")),
        ),
      )
    : allRows;
  const editable = (["unidades", "salas", "fechaduras"] as string[]).includes(
    section,
  );
  const options = editable
    ? await adminResourceOptions()
    : { locations: [], rooms: [] };

  return (
    <section className="overflow-hidden rounded-lg border border-border-subtle bg-surface-raised">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle p-4">
        <form className="flex min-w-[280px] items-center rounded-md border border-border-subtle">
          <input
            aria-label={`Buscar em ${data.title}`}
            name="q"
            defaultValue={query}
            placeholder="Buscar"
            className="h-10 min-w-0 flex-1 px-3 text-sm"
          />
          <button
            type="submit"
            title="Buscar"
            className="grid size-10 place-items-center border-l border-border-subtle"
          >
            <Search size={17} />
          </button>
        </form>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-surface-page text-[11px] uppercase text-text-secondary">
            <tr>
              {data.columns.map((column) => (
                <th key={column} scope="col" className="px-5 py-3 font-bold">
                  {column}
                </th>
              ))}
              {editable && (
                <th scope="col" className="px-5 py-3 text-right font-bold">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {rows.map((row, index) => (
              <tr key={index} className="hover:bg-surface-page">
                {row.cells.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={
                      cellIndex === 0
                        ? "px-5 py-4 font-bold"
                        : "px-5 py-4 text-text-secondary"
                    }
                  >
                    {cellIndex === row.cells.length - 1 ? (
                      <Status value={cell} />
                    ) : (
                      cell
                    )}
                  </td>
                ))}
                {editable && (
                  <td className="px-5 py-4 text-right">
                    {row.record && (
                      <AdminEditDialog
                        section={section as AdminResource}
                        record={row.record}
                        label={data.action}
                        locations={options.locations}
                        rooms={options.rooms}
                      />
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border-subtle px-5 py-4 text-xs text-text-secondary">
        {rows.length} {rows.length === 1 ? "registro" : "registros"}
      </div>
    </section>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-raised p-5">
      <p className="text-xs font-bold uppercase text-text-secondary">{label}</p>
      <strong className="mt-2 block text-2xl tabular-nums">{value}</strong>
    </div>
  );
}

function Status({ value }: { value: string }) {
  // Erro e alerta são separados de propósito: "cancelada" é um desfecho, mas
  // "revisar" e "atrasada" pedem ação de alguém agora.
  const sucesso = /Ativ|Aprov|Online|Sucesso|Pronto|Confirm|Conclu/.test(value);
  const alerta = /Revisar|Pendente|Atenção|Atrasad|Aguardand|Manuten/.test(
    value,
  );
  const erro = /Cancel|Reembols|Expirad|Falh|Recusad/.test(value);
  return (
    <Badge
      tone={sucesso ? "success" : erro ? "danger" : alerta ? "warning" : "info"}
    >
      {value}
    </Badge>
  );
}

const hours = (value: number) => `${value.toFixed(1).replace(".", ",")} h`;
const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(cents / 100);
const weekday = (day: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
  }).format(new Date(`${day}T12:00:00Z`));
