import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SearchField } from "@/components/ui/search-field";
import { Stat, StatGrid } from "@/components/ui/stat";
import { DataTable, type Column } from "@/components/ui/table";
import type { RoomReport, Policy } from "@/lib/server/admin-views";
import { adminSections, type AdminSection } from "@/lib/admin-sections";
import { adminRows, adminResourceOptions } from "@/lib/server/admin-data";
import {
  cleaningQueue,
  companyOperation,
  dayCalendar,
  effectivePolicies,
  monthReport,
} from "@/lib/server/admin-views";
import { CompanyProfileForm } from "@/components/admin/company-profile-form";
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
          <p className="text-subheadline font-bold text-text-link">OPERAÇÃO</p>
          <h1 className="mt-1 text-title1 font-bold">{data.title}</h1>
          <p className="mt-2 text-subheadline text-text-secondary">{data.subtitle}</p>
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
        <label className="text-subheadline">
          <span className="mb-1 block text-caption font-bold uppercase text-text-secondary">
            Dia
          </span>
          <input
            type="date"
            name="dia"
            defaultValue={day}
            className="h-11 rounded-md border border-border-control bg-surface-raised px-3 text-subheadline font-semibold"
          />
        </label>
        <button
          type="submit"
          className="h-11 rounded-md border border-border-control px-4 text-subheadline font-semibold hover:bg-surface-page"
        >
          Ver dia
        </button>
        <p className="ml-auto text-subheadline text-text-secondary">
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
        <label className="text-subheadline">
          <span className="mb-1 block text-caption font-bold uppercase text-text-secondary">
            Mês
          </span>
          <input
            type="month"
            name="mes"
            defaultValue={month}
            className="h-11 rounded-md border border-border-control bg-surface-raised px-3 text-subheadline font-semibold"
          />
        </label>
        <button
          type="submit"
          className="h-11 rounded-md border border-border-control px-4 text-subheadline font-semibold hover:bg-surface-page"
        >
          Ver mês
        </button>
      </form>

      <StatGrid className="mb-5">
        <Stat label="Reservas" value={String(report.totals.bookings)} />
        <Stat label="Horas vendidas" value={hours(report.totals.hours)} />
        <Stat label="Receita" value={money(report.totals.revenueCents)} />
        <Stat label="Ocupação média" value={`${report.totals.occupancy}%`} />
      </StatGrid>

      <Card padding="none" className="overflow-hidden">
        <DataTable
          caption={`Ocupação e receita por sala em ${month}`}
          columns={REPORT_COLUMNS}
          rows={report.rooms}
          rowKey={(room) => `${room.unit}-${room.room}`}
        />
      </Card>
      {report.rooms.length === 0 && (
        <p className="mt-4 text-subheadline text-text-secondary">
          Nenhuma sala ativa no período.
        </p>
      )}
    </>
  );
}

async function PolicyBody() {
  const [policies, company] = await Promise.all([
    effectivePolicies(),
    companyOperation(),
  ]);
  return (
    <>
      {company && (
        <Card padding="none" className="mb-6 overflow-hidden">
          <CardHeader
            title="Perfil do coworking"
            hint="Aparece na página pública, para quem vai alugar."
          />
          <div className="p-5">
            <CompanyProfileForm
              values={company}
              profileHref={`/coworkings/${company.slug}`}
            />
          </div>
        </Card>
      )}
      <p className="mb-5 max-w-prose text-subheadline text-text-secondary">
        Estas são as regras em vigor, lidas de onde o sistema realmente as
        aplica. Cada uma é editada no seu próprio lugar — guardar uma cópia aqui
        criaria duas verdades sobre a mesma regra.
      </p>
      <Card padding="none" className="overflow-hidden">
        <DataTable
          caption="Políticas em vigor e onde cada uma é editada"
          columns={POLICY_COLUMNS}
          rows={policies}
          rowKey={(policy) => `${policy.name}-${policy.scope}`}
        />
      </Card>
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
  const editable = (["unidades", "salas", "fechaduras"] as string[]).includes(
    section,
  );
  // As duas consultas são independentes: em série, a segunda só saía depois da
  // primeira voltar do Supabase, dobrando a espera da aba à toa.
  const [allRows, options] = await Promise.all([
    adminRows(section),
    editable
      ? adminResourceOptions()
      : Promise.resolve({ locations: [], rooms: [] }),
  ]);
  const matched = query
    ? allRows.filter((row) =>
        row.cells.some((cell) =>
          cell
            .toLocaleLowerCase("pt-BR")
            .includes(query.toLocaleLowerCase("pt-BR")),
        ),
      )
    : allRows;
  const rows = matched.map((row, index) => ({ ...row, key: String(index) }));

  const columns: Array<Column<(typeof rows)[number]>> = data.columns.map(
    (header, index) => ({
      key: String(index),
      header,
      primary: index === 0,
      cell: (row) =>
        index === row.cells.length - 1 ? (
          <CellStatus value={row.cells[index]} />
        ) : (
          row.cells[index]
        ),
    }),
  );
  const resultLabel = `${rows.length} ${rows.length === 1 ? "registro encontrado" : "registros encontrados"}`;

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="border-b border-border-subtle p-4">
        <form>
          <SearchField
            label={`Buscar em ${data.title}`}
            defaultValue={query}
            resultLabel={resultLabel}
            className="max-w-md"
          />
        </form>
      </div>
      <DataTable
        caption={`${data.title}: ${data.subtitle}`}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.key}
        action={
          editable
            ? (row) =>
                row.record ? (
                  <AdminEditDialog
                    section={section as AdminResource}
                    record={row.record}
                    label={data.action}
                    locations={options.locations}
                    rooms={options.rooms}
                  />
                ) : null
            : undefined
        }
        empty={
          <p className="p-5 text-subheadline text-text-secondary">
            Nada encontrado{query ? ` para "${query}"` : ""}.
          </p>
        }
      />
      <p className="border-t border-border-subtle px-5 py-4 text-caption text-text-secondary">
        {resultLabel}
      </p>
    </Card>
  );
}

const REPORT_COLUMNS: ReadonlyArray<Column<RoomReport>> = [
  { key: "room", header: "Sala", primary: true, cell: (row) => row.room },
  { key: "unit", header: "Unidade", cell: (row) => row.unit },
  {
    key: "bookings",
    header: "Reservas",
    numeric: true,
    cell: (row) => row.bookings,
  },
  {
    key: "hours",
    header: "Horas",
    numeric: true,
    cell: (row) => hours(row.hours),
  },
  {
    key: "occupancy",
    header: "Ocupação",
    cell: (row) => (
      <span className="flex items-center gap-2">
        <Progress
          value={row.occupancy}
          label={`Ocupação de ${row.room}`}
          className="hidden sm:block"
        />
        <span className="tabular-nums">{row.occupancy}%</span>
      </span>
    ),
  },
  {
    key: "revenue",
    header: "Receita",
    numeric: true,
    cell: (row) => money(row.revenueCents),
  },
];

const POLICY_COLUMNS: ReadonlyArray<Column<Policy>> = [
  { key: "name", header: "Política", primary: true, cell: (row) => row.name },
  { key: "value", header: "Valor em vigor", cell: (row) => row.value },
  { key: "scope", header: "Escopo", cell: (row) => row.scope },
  {
    key: "where",
    header: "Onde muda",
    numeric: true,
    cell: (row) => (
      <Link
        href={row.href}
        className="inline-flex items-center gap-1 text-subheadline font-bold text-text-link"
      >
        Abrir
        <ChevronRight size={15} aria-hidden="true" />
      </Link>
    ),
  },
];

/**
 * Heurística sobre texto já formatado. As linhas genéricas do `adminRows` são
 * `string[]` — fechadura, pagamento e log não compartilham vocabulário de
 * status. Enquanto essas linhas não forem tipadas, o tom só pode ser adivinhado
 * a partir da palavra; reservas não passam por aqui, elas usam `BookingStatus`.
 */
function CellStatus({ value }: { value: string }) {
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
