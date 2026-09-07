import "server-only";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { demoBookingDetail, type BookingDetailView } from "./booking-detail";
import { requestCustomer } from "./customer";

export type CustomerBookingView = Readonly<{
  id: string;
  room: string;
  roomSlug: string;
  /** Coworking dono da sala. Vazio quando não vinculado. */
  coworking: string;
  location: string;
  address: string;
  date: string;
  time: string;
  endTime: string;
  /** Instantes ISO (UTC), para o botão de calendário. */
  startAtIso: string;
  endAtIso: string;
  timeZone: string;
  status: "Confirmada" | "Aguardando" | "Concluída" | "Cancelada";
  /** Estado da credencial, para dizer se o acesso está de pé. */
  accessStatus: "active" | "pending" | "revoked" | "failed" | null;
  /** Janela do código e fingerprint mascarado — o código cheio nunca chega aqui. */
  validFrom: string | null;
  validUntil: string | null;
  fingerprint: string | null;
}>;

export type CustomerBookings = {
  upcoming: CustomerBookingView[];
  completed: CustomerBookingView[];
  cancelled: CustomerBookingView[];
};

export async function customerBookings(): Promise<CustomerBookings | null> {
  if (integrationMode() === "simulator") {
    return { upcoming: [fromDetail(demoBookingDetail())], completed: [], cancelled: [] };
  }
  const customer = await requestCustomer();
  if (!customer) return { upcoming: [], completed: [], cancelled: [] };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id,start_at,end_at,status,total_cents," +
        "rooms(name,slug,companies(name),locations(name,address,city,state,timezone))," +
        "booking_access_codes(status,valid_from,valid_until,access_code_fingerprint)",
    )
    .eq("user_id", customer.id)
    .order("start_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`customer_bookings_failed:${error.code}`);

  const now = Date.now();
  // O select com relações aninhadas não é inferível pelo tipo gerado; o `mapBooking`
  // é a única fonte de verdade sobre a forma da linha, como em booking-detail.
  const rows = ((data ?? []) as unknown as Record<string, unknown>[]).map(
    mapBooking,
  );
  const upcoming = rows
    .filter((b) => b.status !== "Cancelada" && Date.parse(b.endAtIso) >= now)
    .sort((a, b) => Date.parse(a.startAtIso) - Date.parse(b.startAtIso));
  const completed = rows.filter(
    (b) => b.status !== "Cancelada" && Date.parse(b.endAtIso) < now,
  );
  const cancelled = rows.filter((b) => b.status === "Cancelada");
  return { upcoming, completed, cancelled };
}

function mapBooking(row: Record<string, unknown>): CustomerBookingView {
  const room = row.rooms as {
    name?: string;
    slug?: string;
    companies?: { name?: string } | null;
    locations?: {
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      timezone?: string;
    } | null;
  } | null;
  const location = room?.locations ?? null;
  const credentials = row.booking_access_codes as
    | Array<{
        status?: string;
        valid_from?: string;
        valid_until?: string;
        access_code_fingerprint?: string | null;
      }>
    | undefined;
  const credential = credentials?.[0];
  const timeZone = location?.timezone ?? "America/Sao_Paulo";
  const startIso = String(row.start_at);
  const endIso = String(row.end_at);
  return {
    id: String(row.id),
    room: room?.name ?? "Sala",
    roomSlug: String(room?.slug ?? ""),
    coworking: room?.companies?.name ?? "",
    location: location?.name ?? "",
    address: [
      location?.address,
      [location?.city, location?.state].filter(Boolean).join("/"),
    ]
      .filter(Boolean)
      .join(" · "),
    date: fmtDate(startIso, timeZone),
    time: fmtTime(startIso, timeZone),
    endTime: fmtTime(endIso, timeZone),
    startAtIso: startIso,
    endAtIso: endIso,
    timeZone,
    status: mapStatus(String(row.status)),
    accessStatus: mapAccessStatus(credential?.status),
    validFrom: credential?.valid_from ?? null,
    validUntil: credential?.valid_until ?? null,
    fingerprint: credential?.access_code_fingerprint ?? null,
  };
}

function fmtDate(iso: string, timeZone: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone });
}
function fmtTime(iso: string, timeZone: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
}

function mapStatus(status: string): CustomerBookingView["status"] {
  if (status === "confirmed" || status === "in_progress") return "Confirmada";
  if (status === "awaiting_payment") return "Aguardando";
  if (status === "cancelled" || status === "refunded") return "Cancelada";
  return "Concluída";
}

function mapAccessStatus(status?: string): CustomerBookingView["accessStatus"] {
  if (status === "active") return "active";
  if (status === "pending") return "pending";
  if (status === "revoked") return "revoked";
  if (status === "failed" || status === "manual_review") return "failed";
  return null;
}

function fromDetail(detail: BookingDetailView): CustomerBookingView {
  const clock = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: detail.timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  return {
    id: detail.id,
    room: detail.roomName,
    roomSlug: detail.roomSlug,
    coworking: "",
    location: detail.unit,
    address: detail.address,
    date: new Intl.DateTimeFormat("pt-BR", { timeZone: detail.timeZone }).format(
      new Date(detail.startAt),
    ),
    time: clock(detail.startAt),
    endTime: clock(detail.endAt),
    startAtIso: detail.startAt,
    endAtIso: detail.endAt,
    timeZone: detail.timeZone,
    status: "Confirmada",
    accessStatus:
      detail.credential.status === "active" ? "active" : "pending",
    validFrom: detail.credential.validFrom,
    validUntil: detail.credential.validUntil,
    fingerprint: detail.credential.fingerprint,
  };
}
