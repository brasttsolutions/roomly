import "server-only";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BOOKING_TIME_ZONE, isoDay } from "@/lib/utils";

/**
 * Consulta que falha tem que derrubar a tela, não virar lista vazia. O painel
 * lia oito consultas sem olhar o erro nenhuma vez: um coworking lotado era
 * apresentado como "0 reservas hoje, 0% de ocupação", com HTTP 200 e sem log.
 * Quem olha esse número decide preço com ele.
 */
function linhas<T>(
  resultado: { data: T[] | null; error: { code?: string } | null },
  consulta: string,
): T[] {
  if (resultado.error)
    throw new Error(
      `admin_dashboard_${consulta}_failed:${resultado.error.code ?? "unknown"}`,
    );
  return resultado.data ?? [];
}

export type Pendency = Readonly<{
  id: string;
  severity: "danger" | "warning";
  title: string;
  detail: string;
  href: string;
}>;

export type Metric = Readonly<{ label: string; value: string; hint: string }>;

export type TodayBooking = Readonly<{
  id: string;
  time: string;
  endTime: string;
  room: string;
  customer: string;
  duration: string;
  /** Status cru do banco: quem traduz é o `BookingStatus`, num lugar só. */
  status: string;
}>;

export type DashboardData = Readonly<{
  day: string;
  units: ReadonlyArray<{ id: string; name: string }>;
  unit: string | null;
  pendencies: readonly Pendency[];
  metrics: readonly Metric[];
  week: ReadonlyArray<{ day: string; label: string; hours: number }>;
  bookings: readonly TodayBooking[];
  bookedHoursToday: number;
  locksOnline: string;
  nextCleaning: string | null;
}>;

/** Estados que ocupam a sala de fato. Cancelada não conta como ocupação. */
const OCCUPYING = ["awaiting_payment", "confirmed", "in_progress", "completed"];

export async function adminDashboard(unit?: string): Promise<DashboardData> {
  if (integrationMode() === "simulator") return simulatorDashboard(unit);

  const supabase = await createSupabaseServerClient();
  const day = isoDay();
  const dayStart = new Date(`${day}T00:00:00-03:00`);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const weekStart = new Date(dayStart.getTime() - 6 * 86_400_000);
  const monthStart = new Date(`${day.slice(0, 7)}-01T00:00:00-03:00`);

  // Unidades e salas não dependem uma da outra — o recorte por unidade é feito
  // aqui, em memória. Em série custavam duas idas ao banco antes de a primeira
  // consulta de reservas começar.
  const [locationResult, roomResult] = await Promise.all([
    supabase
      .from("locations")
      .select("id,name,opening_time,closing_time")
      .eq("status", "active")
      .order("name"),
    supabase.from("rooms").select("id,name,location_id").eq("status", "active"),
  ]);
  const locations = linhas(locationResult, "locations");
  const selected = locations.find((location) => location.name === unit) ?? null;

  const rooms = linhas(roomResult, "rooms").filter(
    (room) => !selected || room.location_id === selected.id,
  );
  const roomIds = rooms.map((room) => room.id);
  const roomName = new Map(rooms.map((room) => [room.id, room.name]));

  const [weekResult, monthResult, lockResult, cleaningResult, accessResult, jobResult] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id,start_at,end_at,status,room_id,customers(name)")
        .in("room_id", roomIds)
        .in("status", OCCUPYING)
        .gte("start_at", weekStart.toISOString())
        .lt("start_at", dayEnd.toISOString())
        .order("start_at"),
      supabase
        .from("bookings")
        .select("total_cents")
        .in("room_id", roomIds)
        .in("status", ["confirmed", "in_progress", "completed"])
        .gte("start_at", monthStart.toISOString()),
      supabase.from("locks").select("id,name,status,battery_level,room_id"),
      supabase
        .from("cleaning_requests")
        .select("id,room_id,scheduled_at,status")
        .in("room_id", roomIds)
        .in("status", ["pending", "assigned", "in_progress"])
        .order("scheduled_at"),
      supabase
        .from("booking_access_codes")
        .select("booking_id,status")
        .in("status", ["failed", "manual_review"]),
      supabase
        .from("durable_jobs")
        .select("id,kind", { count: "exact" })
        .eq("status", "manual_review"),
    ]);

  const bookings = linhas(weekResult, "week");
  const now = Date.now();

  const todayRows = bookings.filter(
    (row) =>
      Date.parse(row.start_at) >= dayStart.getTime() &&
      Date.parse(row.start_at) < dayEnd.getTime(),
  );
  const bookedHoursToday = hoursOf(todayRows);

  // Horas vendáveis do dia: cada sala aberta pelo expediente da sua unidade.
  const openHours = rooms.reduce((total, room) => {
    const location = locations.find((item) => item.id === room.location_id);
    return total + businessHours(location);
  }, 0);
  const occupancy =
    openHours > 0 ? Math.round((bookedHoursToday / openHours) * 100) : 0;

  const monthRows = linhas(monthResult, "month");
  const revenueCents = monthRows.reduce(
    (total, row) => total + Number(row.total_cents ?? 0),
    0,
  );
  const paidCount = monthRows.length;

  const locks = linhas(lockResult, "locks").filter(
    (lock) => roomIds.length === 0 || roomIds.includes(lock.room_id),
  );

  const pendencies: Pendency[] = [];
  const cleaningRows = linhas(cleaningResult, "cleaning");
  for (const request of cleaningRows) {
    const late = Date.parse(request.scheduled_at) < now;
    pendencies.push({
      id: `cleaning:${request.id}`,
      severity: late ? "danger" : "warning",
      title: late ? "Limpeza atrasada" : "Limpeza pendente",
      detail: `${roomName.get(request.room_id) ?? "Sala"} · ${clock(request.scheduled_at)}`,
      href: "/admin/limpeza",
    });
  }
  for (const lock of locks) {
    if (lock.status === "online") continue;
    pendencies.push({
      id: `lock:${lock.id}`,
      severity: lock.status === "offline" ? "danger" : "warning",
      title:
        lock.status === "offline" ? "Fechadura offline" : "Fechadura em atenção",
      detail: `${lock.name} · ${roomName.get(lock.room_id) ?? "Sala"}${
        lock.battery_level == null ? "" : ` · ${lock.battery_level}% de bateria`
      }`,
      href: "/admin/fechaduras",
    });
  }
  for (const access of linhas(accessResult, "access")) {
    pendencies.push({
      id: `access:${access.booking_id}`,
      severity: "danger",
      title: "Acesso não liberado",
      detail: `Reserva #${String(access.booking_id).slice(0, 8).toUpperCase()} — o cliente pagou e a porta não abre.`,
      href: "/admin/reservas",
    });
  }
  for (const job of linhas(jobResult, "jobs")) {
    pendencies.push({
      id: `job:${job.id}`,
      severity: "warning",
      title: "Integração em revisão",
      detail: `${job.kind} aguardando conferência humana.`,
      href: "/admin/logs",
    });
  }
  // O mais grave primeiro: quem abre o painel precisa ver o pior antes do resto.
  pendencies.sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "danger" ? -1 : 1,
  );

  const nextCleaning = cleaningRows.find(
    (request) => Date.parse(request.scheduled_at) >= now,
  );

  return {
    day,
    units: locations.map((location) => ({
      id: location.id,
      name: location.name,
    })),
    unit: selected?.name ?? null,
    pendencies,
    metrics: [
      {
        label: "Reservas hoje",
        value: String(todayRows.length),
        hint: `${bookedHoursToday.toFixed(1).replace(".", ",")} h vendidas`,
      },
      {
        label: "Ocupação hoje",
        value: `${occupancy}%`,
        hint: `${openHours} h disponíveis em ${rooms.length} ${rooms.length === 1 ? "sala" : "salas"}`,
      },
      {
        label: "Receita no mês",
        value: money(revenueCents),
        hint: `${paidCount} ${paidCount === 1 ? "reserva paga" : "reservas pagas"}`,
      },
      {
        label: "Ticket médio",
        value: paidCount > 0 ? money(revenueCents / paidCount) : "—",
        hint: "No mês corrente",
      },
    ],
    week: weekDays(dayStart).map((entry) => ({
      ...entry,
      hours: hoursOf(
        bookings.filter(
          (row) => isoDayOf(row.start_at) === entry.day,
        ),
      ),
    })),
    bookings: todayRows.map((row) => ({
      id: String(row.id),
      time: clock(row.start_at),
      endTime: clock(row.end_at),
      room: roomName.get(row.room_id) ?? "Sala",
      customer:
        (row.customers as { name?: string } | null)?.name ?? "Cliente",
      duration: `${((Date.parse(row.end_at) - Date.parse(row.start_at)) / 3_600_000)
        .toFixed(1)
        .replace(".", ",")} h`,
      status: String(row.status),
    })),
    bookedHoursToday,
    locksOnline: `${locks.filter((lock) => lock.status === "online").length} de ${locks.length}`,
    nextCleaning: nextCleaning ? clock(nextCleaning.scheduled_at) : null,
  };
}

function businessHours(location?: {
  opening_time?: string;
  closing_time?: string;
}) {
  const open = minutes(location?.opening_time ?? "08:00");
  const close = minutes(location?.closing_time ?? "20:00");
  return Math.max(0, (close - open) / 60);
}

const minutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

const hoursOf = (rows: ReadonlyArray<{ start_at: string; end_at: string }>) =>
  rows.reduce(
    (total, row) =>
      total + (Date.parse(row.end_at) - Date.parse(row.start_at)) / 3_600_000,
    0,
  );

function weekDays(end: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end.getTime() - (6 - index) * 86_400_000);
    return {
      day: isoDay(date),
      label: new Intl.DateTimeFormat("pt-BR", {
        timeZone: BOOKING_TIME_ZONE,
        weekday: "short",
      })
        .format(date)
        .replace(".", "")
        .slice(0, 3),
    };
  });
}

const isoDayOf = (iso: string) => isoDay(new Date(iso));

const clock = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: BOOKING_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(cents / 100);

/**
 * Painel do simulador: mesma forma, números coerentes entre si e presos ao
 * relógio, para a tela ser exercitável sem banco.
 */
function simulatorDashboard(unit?: string): DashboardData {
  const day = isoDay();
  const units = [
    { id: "unidade-1", name: "Ágora Tech Park" },
    { id: "unidade-2", name: "Centro Joinville" },
  ];
  const selected = units.find((item) => item.name === unit) ?? null;
  const bookings: TodayBooking[] = [
    {
      id: "sim-1",
      time: "09:00",
      endTime: "10:30",
      room: "Sala Executiva",
      customer: "Marina Alves",
      duration: "1,5 h",
      status: "confirmed",
    },
    {
      id: "sim-2",
      time: "11:00",
      endTime: "12:00",
      room: "Sala Foco",
      customer: "Rafael Lima",
      duration: "1,0 h",
      status: "in_progress",
    },
    {
      id: "sim-3",
      time: "14:00",
      endTime: "16:00",
      room: "Atelier Criativo",
      customer: "Bianca Prado",
      duration: "2,0 h",
      status: "awaiting_payment",
    },
  ];
  const hours = 4.5;
  return {
    day,
    units,
    unit: selected?.name ?? null,
    pendencies: [
      {
        id: "sim-cleaning",
        severity: "danger",
        title: "Limpeza atrasada",
        detail: "Sala Foco · 11:00",
        href: "/admin/limpeza",
      },
      {
        id: "sim-lock",
        severity: "warning",
        title: "Fechadura em atenção",
        detail: "TTLock B-101 · Sala Foco · 18% de bateria",
        href: "/admin/fechaduras",
      },
    ],
    metrics: [
      { label: "Reservas hoje", value: "3", hint: "4,5 h vendidas" },
      { label: "Ocupação hoje", value: "13%", hint: "36 h disponíveis em 3 salas" },
      { label: "Receita no mês", value: "R$ 4.980", hint: "38 reservas pagas" },
      { label: "Ticket médio", value: "R$ 131", hint: "No mês corrente" },
    ],
    week: weekDays(new Date(`${day}T12:00:00-03:00`)).map((entry, index) => ({
      ...entry,
      hours: [3, 5.5, 4, 7, 6.5, 2, hours][index],
    })),
    bookings,
    bookedHoursToday: hours,
    locksOnline: "5 de 6",
    nextCleaning: "16:20",
  };
}
