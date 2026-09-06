import "server-only";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BOOKING_TIME_ZONE, isoDay } from "@/lib/utils";
import { requestIdentity } from "./identity";

/* ------------------------------------------------------------------ limpeza */

export type CleaningStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

export type CleaningTask = Readonly<{
  id: string;
  room: string;
  scheduledAt: string;
  window: string;
  assignee: string | null;
  status: CleaningStatus;
  /** Minutos de atraso. Zero quando ainda está no prazo. */
  lateMinutes: number;
}>;

export async function cleaningQueue(): Promise<readonly CleaningTask[]> {
  if (integrationMode() === "simulator") return simulatorQueue();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cleaning_requests")
    .select("id,scheduled_at,status,rooms(name),profiles(name)")
    .in("status", ["pending", "assigned", "in_progress"])
    .order("scheduled_at")
    .limit(100);
  if (error) throw new Error(`admin_cleaning_failed:${error.code}`);
  const now = Date.now();
  return (data ?? []).map((row) => {
    const scheduled = Date.parse(row.scheduled_at);
    return {
      id: String(row.id),
      room: (row.rooms as { name?: string } | null)?.name ?? "Sala",
      scheduledAt: row.scheduled_at,
      window: clock(row.scheduled_at),
      assignee: (row.profiles as { name?: string } | null)?.name ?? null,
      status: row.status as CleaningStatus,
      lateMinutes: Math.max(0, Math.round((now - scheduled) / 60_000)),
    };
  });
}

/* --------------------------------------------------------------- calendário */

export type CalendarBooking = Readonly<{
  id: string;
  roomId: string;
  customer: string;
  startMinutes: number;
  endMinutes: number;
  label: string;
  status: string;
}>;

export type DayCalendar = Readonly<{
  day: string;
  openingMinutes: number;
  closingMinutes: number;
  rooms: ReadonlyArray<{ id: string; name: string; unit: string }>;
  bookings: readonly CalendarBooking[];
}>;

export async function dayCalendar(day: string): Promise<DayCalendar> {
  if (integrationMode() === "simulator") return simulatorCalendar(day);
  const supabase = await createSupabaseServerClient();
  const start = new Date(`${day}T00:00:00-03:00`);
  const end = new Date(start.getTime() + 86_400_000);
  const [roomResult, bookingResult] = await Promise.all([
    supabase
      .from("rooms")
      .select("id,name,locations(name,opening_time,closing_time)")
      .eq("status", "active")
      .order("name"),
    supabase
      .from("bookings")
      .select("id,room_id,start_at,end_at,status,profiles(name)")
      .in("status", ["awaiting_payment", "confirmed", "in_progress", "completed"])
      .gte("start_at", start.toISOString())
      .lt("start_at", end.toISOString())
      .order("start_at"),
  ]);
  if (roomResult.error) throw new Error("admin_calendar_rooms_failed");
  if (bookingResult.error) throw new Error("admin_calendar_bookings_failed");

  const rooms = (roomResult.data ?? []).map((row) => {
    const location = row.locations as {
      name?: string;
      opening_time?: string;
      closing_time?: string;
    } | null;
    return {
      id: String(row.id),
      name: String(row.name),
      unit: location?.name ?? "Unidade",
      opening: minutesOf(location?.opening_time ?? "08:00"),
      closing: minutesOf(location?.closing_time ?? "20:00"),
    };
  });

  return {
    day,
    openingMinutes: Math.min(...rooms.map((room) => room.opening), 8 * 60),
    closingMinutes: Math.max(...rooms.map((room) => room.closing), 20 * 60),
    rooms: rooms.map(({ id, name, unit }) => ({ id, name, unit })),
    bookings: (bookingResult.data ?? []).map((row) => ({
      id: String(row.id),
      roomId: String(row.room_id),
      customer: (row.profiles as { name?: string } | null)?.name ?? "Cliente",
      startMinutes: localMinutes(row.start_at),
      endMinutes: localMinutes(row.end_at),
      label: `${clock(row.start_at)} – ${clock(row.end_at)}`,
      status: String(row.status),
    })),
  };
}

/* --------------------------------------------------------------- relatórios */

export type RoomReport = Readonly<{
  room: string;
  unit: string;
  bookings: number;
  hours: number;
  occupancy: number;
  revenueCents: number;
}>;

export type MonthReport = Readonly<{
  month: string;
  rooms: readonly RoomReport[];
  totals: Readonly<{
    bookings: number;
    hours: number;
    revenueCents: number;
    occupancy: number;
  }>;
}>;

export async function monthReport(month: string): Promise<MonthReport> {
  if (integrationMode() === "simulator") return simulatorReport(month);
  const supabase = await createSupabaseServerClient();
  const start = new Date(`${month}-01T00:00:00-03:00`);
  const end = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
  );
  const [roomResult, bookingResult] = await Promise.all([
    supabase
      .from("rooms")
      .select("id,name,locations(name,opening_time,closing_time)")
      .eq("status", "active")
      .order("name"),
    supabase
      .from("bookings")
      .select("room_id,start_at,end_at,total_cents,status")
      .in("status", ["confirmed", "in_progress", "completed"])
      .gte("start_at", start.toISOString())
      .lt("start_at", end.toISOString()),
  ]);
  if (roomResult.error || bookingResult.error)
    throw new Error("admin_report_failed");

  const days = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const bookings = bookingResult.data ?? [];

  const rooms = (roomResult.data ?? []).map((row) => {
    const location = row.locations as {
      name?: string;
      opening_time?: string;
      closing_time?: string;
    } | null;
    const mine = bookings.filter((booking) => booking.room_id === row.id);
    const hours = mine.reduce(
      (total, booking) =>
        total +
        (Date.parse(booking.end_at) - Date.parse(booking.start_at)) /
          3_600_000,
      0,
    );
    const sellable =
      ((minutesOf(location?.closing_time ?? "20:00") -
        minutesOf(location?.opening_time ?? "08:00")) /
        60) *
      days;
    return {
      room: String(row.name),
      unit: location?.name ?? "Unidade",
      bookings: mine.length,
      hours,
      occupancy: sellable > 0 ? Math.round((hours / sellable) * 100) : 0,
      revenueCents: mine.reduce(
        (total, booking) => total + Number(booking.total_cents ?? 0),
        0,
      ),
    };
  });

  return { month, rooms, totals: sumRooms(rooms) };
}

function sumRooms(rooms: readonly RoomReport[]) {
  const hours = rooms.reduce((total, room) => total + room.hours, 0);
  return {
    bookings: rooms.reduce((total, room) => total + room.bookings, 0),
    hours,
    revenueCents: rooms.reduce((total, room) => total + room.revenueCents, 0),
    occupancy:
      rooms.length === 0
        ? 0
        : Math.round(
            rooms.reduce((total, room) => total + room.occupancy, 0) /
              rooms.length,
          ),
  };
}

/* ------------------------------------------------------------ configurações */

export type Policy = Readonly<{
  name: string;
  value: string;
  scope: string;
  href: string;
}>;

/**
 * As políticas em vigor, lidas de onde o sistema realmente as aplica. Uma tela
 * de configurações que guardasse esses valores num segundo lugar criaria duas
 * verdades sobre a mesma regra.
 */
export async function effectivePolicies(): Promise<readonly Policy[]> {
  const fixed: Policy[] = [
    {
      name: "Hold de pagamento",
      value: "10 minutos",
      scope: "Sistema · create_booking_hold",
      href: "/admin/logs",
    },
    {
      name: "Grade de horários",
      value: "Blocos de 30 minutos",
      scope: "Sistema · disponibilidade",
      href: "/admin/calendario",
    },
  ];
  if (integrationMode() === "simulator") {
    return [
      {
        name: "Expediente",
        value: "08:00 – 20:00",
        scope: "Ágora Tech Park",
        href: "/admin/unidades",
      },
      {
        name: "Duração da reserva",
        value: "60 a 240 minutos",
        scope: "Sala Executiva",
        href: "/admin/salas",
      },
      {
        name: "Limpeza entre reservas",
        value: "20 minutos",
        scope: "Sala Executiva",
        href: "/admin/salas",
      },
      ...fixed,
    ];
  }
  const supabase = await createSupabaseServerClient();
  const [locationResult, roomResult] = await Promise.all([
    supabase
      .from("locations")
      .select("name,opening_time,closing_time")
      .eq("status", "active")
      .order("name"),
    supabase
      .from("rooms")
      .select(
        "name,minimum_booking_minutes,maximum_booking_minutes,cleaning_time_minutes,access_before_minutes,access_after_minutes",
      )
      .eq("status", "active")
      .order("name"),
  ]);
  if (locationResult.error || roomResult.error)
    throw new Error("admin_policies_failed");

  const policies: Policy[] = [];
  for (const location of locationResult.data ?? []) {
    policies.push({
      name: "Expediente",
      value: `${String(location.opening_time).slice(0, 5)} – ${String(location.closing_time).slice(0, 5)}`,
      scope: location.name,
      href: "/admin/unidades",
    });
  }
  for (const room of roomResult.data ?? []) {
    policies.push({
      name: "Duração da reserva",
      value: `${room.minimum_booking_minutes} a ${room.maximum_booking_minutes} minutos`,
      scope: room.name,
      href: "/admin/salas",
    });
    policies.push({
      name: "Limpeza entre reservas",
      value: `${room.cleaning_time_minutes} minutos`,
      scope: room.name,
      href: "/admin/salas",
    });
    policies.push({
      name: "Tolerância de acesso",
      value: `${room.access_before_minutes} min antes, ${room.access_after_minutes} min depois`,
      scope: room.name,
      href: "/admin/salas",
    });
  }
  return [...policies, ...fixed];
}

/* ----------------------------------------------------------------- auxílios */

const minutesOf = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

function localMinutes(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BOOKING_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  return minutesOf(parts);
}

const clock = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: BOOKING_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));

/* ---------------------------------------------------------------- simulador */

function simulatorQueue(): CleaningTask[] {
  const base = new Date(`${isoDay()}T11:00:00-03:00`).toISOString();
  return [
    {
      id: "sim-clean-1",
      room: "Sala Foco",
      scheduledAt: base,
      window: "11:00",
      assignee: null,
      status: "pending",
      lateMinutes: 45,
    },
    {
      id: "sim-clean-2",
      room: "Sala Executiva",
      scheduledAt: new Date(`${isoDay()}T16:20:00-03:00`).toISOString(),
      window: "16:20",
      assignee: "Carla Souza",
      status: "assigned",
      lateMinutes: 0,
    },
    {
      id: "sim-clean-3",
      room: "Atelier Criativo",
      scheduledAt: new Date(`${isoDay()}T18:00:00-03:00`).toISOString(),
      window: "18:00",
      assignee: "Paulo Reis",
      status: "in_progress",
      lateMinutes: 0,
    },
  ];
}

function simulatorCalendar(day: string): DayCalendar {
  return {
    day,
    openingMinutes: 8 * 60,
    closingMinutes: 20 * 60,
    rooms: [
      { id: "sala-1", name: "Sala Executiva", unit: "Ágora Tech Park" },
      { id: "sala-2", name: "Sala Foco", unit: "Ágora Tech Park" },
      { id: "sala-3", name: "Atelier Criativo", unit: "Centro Joinville" },
    ],
    bookings: [
      {
        id: "sim-b1",
        roomId: "sala-1",
        customer: "Marina Alves",
        startMinutes: 9 * 60,
        endMinutes: 10 * 60 + 30,
        label: "09:00 – 10:30",
        status: "confirmed",
      },
      {
        id: "sim-b2",
        roomId: "sala-2",
        customer: "Rafael Lima",
        startMinutes: 11 * 60,
        endMinutes: 12 * 60,
        label: "11:00 – 12:00",
        status: "in_progress",
      },
      {
        id: "sim-b3",
        roomId: "sala-3",
        customer: "Bianca Prado",
        startMinutes: 14 * 60,
        endMinutes: 16 * 60,
        label: "14:00 – 16:00",
        status: "awaiting_payment",
      },
    ],
  };
}

function simulatorReport(month: string): MonthReport {
  const rooms: RoomReport[] = [
    {
      room: "Sala Executiva",
      unit: "Ágora Tech Park",
      bookings: 18,
      hours: 26,
      occupancy: 7,
      revenueCents: 312000,
    },
    {
      room: "Sala Foco",
      unit: "Ágora Tech Park",
      bookings: 12,
      hours: 14,
      occupancy: 4,
      revenueCents: 105000,
    },
    {
      room: "Atelier Criativo",
      unit: "Centro Joinville",
      bookings: 8,
      hours: 19,
      occupancy: 5,
      revenueCents: 313500,
    },
  ];
  return { month, rooms, totals: sumRooms(rooms) };
}

/* ----------------------------------------------- perfil público da empresa */

export type CompanyOperation = Readonly<{
  name: string;
  slug: string;
  description: string;
  websiteUrl: string;
  logoUrl: string;
  cleaningContactPhone: string;
}>;

/**
 * Lê da tabela, não da view: aqui quem olha é o gestor da própria empresa, e
 * ele precisa dos campos para editar. A view existe para o público.
 */
export async function companyOperation(): Promise<CompanyOperation | null> {
  if (integrationMode() === "simulator") {
    return {
      name: "Ágora Coworking",
      slug: "agora-coworking",
      description: "Espaços de trabalho em Joinville.",
      websiteUrl: "",
      logoUrl: "",
      cleaningContactPhone: "",
    };
  }
  const identity = await requestIdentity();
  if (!identity) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("companies")
    .select("name,slug,description,website_url,logo_url,cleaning_contact_phone")
    .eq("id", identity.companyId)
    .maybeSingle();
  if (!data) return null;
  return {
    name: data.name,
    slug: data.slug,
    description: data.description ?? "",
    websiteUrl: data.website_url ?? "",
    logoUrl: data.logo_url ?? "",
    cleaningContactPhone: data.cleaning_contact_phone ?? "",
  };
}
