import "server-only";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { demoBookingDetail, type BookingDetailView } from "./booking-detail";
import { requestIdentity } from "./identity";

export type CustomerBookingView = Readonly<{
  id: string;
  room: string;
  location: string;
  date: string;
  time: string;
  endTime: string;
  status: "Confirmada" | "Aguardando" | "Concluída" | "Cancelada";
  /** Estado da credencial, para a lista dizer se o acesso está de pé. */
  accessStatus: "active" | "pending" | "revoked" | "failed" | null;
}>;

export async function customerBookings(): Promise<{
  current: CustomerBookingView | null;
  history: CustomerBookingView[];
} | null> {
  if (integrationMode() === "simulator") {
    // Um só exemplo, o mesmo que a página de detalhe usa: dois exemplos
    // divergiriam no primeiro ajuste.
    return { current: asListItem(demoBookingDetail()), history: [] };
  }
  const identity = await requestIdentity();
  if (!identity) return { current: null, history: [] };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id,start_at,end_at,status,rooms(name,locations(name)),booking_access_codes(status)",
    )
    .eq("company_id", identity.companyId)
    .eq("user_id", identity.profileId)
    .order("start_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`customer_bookings_failed:${error.code}`);

  const rows = (data ?? []).map(mapBooking);
  const current = rows.find(
    (booking) =>
      booking.status === "Confirmada" || booking.status === "Aguardando",
  );
  return {
    current: current ?? null,
    history: rows.filter((booking) => booking.id !== current?.id),
  };
}

function mapBooking(row: Record<string, unknown>): CustomerBookingView {
  const room = row.rooms as {
    name?: string;
    locations?: { name?: string } | null;
  } | null;
  const credentials = row.booking_access_codes as
    | Array<{ status?: string }>
    | undefined;
  const start = new Date(String(row.start_at));
  const end = new Date(String(row.end_at));
  return {
    id: String(row.id),
    room: room?.name ?? "Sala",
    location: room?.locations?.name ?? "Unidade",
    date: start.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    time: start.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }),
    endTime: end.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }),
    status: mapStatus(String(row.status)),
    accessStatus: mapAccessStatus(credentials?.[0]?.status),
  };
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

function asListItem(detail: BookingDetailView): CustomerBookingView {
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
    location: detail.unit,
    date: new Intl.DateTimeFormat("pt-BR", {
      timeZone: detail.timeZone,
    }).format(new Date(detail.startAt)),
    time: clock(detail.startAt),
    endTime: clock(detail.endAt),
    status: "Confirmada",
    accessStatus: detail.credential.status === "active" ? "active" : null,
  };
}
