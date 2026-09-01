import "server-only";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requestIdentity } from "./identity";

export type CustomerBookingView = Readonly<{
  id: string;
  room: string;
  location: string;
  date: string;
  time: string;
  endTime: string;
  status: "Confirmada" | "Aguardando" | "Concluída" | "Cancelada";
  accessCode?: string;
}>;

export async function customerBookings(): Promise<{
  current: CustomerBookingView | null;
  history: CustomerBookingView[];
} | null> {
  if (integrationMode() === "simulator") return null;
  const identity = await requestIdentity();
  if (!identity) return { current: null, history: [] };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id,start_at,end_at,status,rooms(name,locations(name)),booking_access_codes(status,access_code_fingerprint)",
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
    | Array<{ status?: string; access_code_fingerprint?: string | null }>
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
    accessCode:
      credentials?.[0]?.status === "active" ? "Código protegido" : undefined,
  };
}

function mapStatus(status: string): CustomerBookingView["status"] {
  if (status === "confirmed" || status === "in_progress") return "Confirmada";
  if (status === "awaiting_payment") return "Aguardando";
  if (status === "cancelled" || status === "refunded") return "Cancelada";
  return "Concluída";
}
