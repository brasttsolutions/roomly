import "server-only";
import type { AccessStatus } from "@/modules/access/credential";
import { SLOT_MINUTES, zonedInstant } from "@/modules/availability/domain";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rooms as demoRooms } from "@/lib/demo-data";
import { availabilityRoomBySlug, busyIntervals } from "./availability";
import { requestIdentity } from "./identity";

export type ExtensionOffer = Readonly<{
  /** Minutos que ainda cabem depois do fim da reserva. Zero quando não cabe. */
  maxMinutes: number;
  /** A extensão é uma reserva nova e herda a duração mínima da sala. */
  minMinutes: number;
  priceCentsPerSlot: number;
  /** Por que o limite é esse. Sempre preenchido, inclusive quando cabe. */
  reason: string;
}>;

export type BookingDetailView = Readonly<{
  id: string;
  roomName: string;
  roomSlug: string;
  unit: string;
  address: string;
  startAt: string;
  endAt: string;
  timeZone: string;
  status: string;
  totalCents: number;
  hourlyPriceCents: number;
  roomId: string;
  credential: Readonly<{
    status: AccessStatus | null;
    validFrom: string | null;
    validUntil: string | null;
    fingerprint: string | null;
  }>;
  extension: ExtensionOffer | null;
}>;

/**
 * Uma reserva do próprio cliente, com credencial e oferta de extensão. Devolve
 * `null` no simulador: a página cai no exemplo, como a lista já faz.
 */
export async function bookingDetail(
  id: string,
): Promise<BookingDetailView | null> {
  if (integrationMode() === "simulator")
    return id === DEMO_BOOKING_ID ? demoBookingDetail() : null;
  const identity = await requestIdentity();
  if (!identity) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id,start_at,end_at,status,total_cents,room_id," +
        "rooms(name,slug,hourly_price_cents,locations(name,address,city,state,timezone))," +
        "booking_access_codes(status,valid_from,valid_until,access_code_fingerprint)",
    )
    .eq("company_id", identity.companyId)
    .eq("user_id", identity.profileId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`booking_detail_failed:${error.code}`);
  if (!data) return null;

  // O `select` com relações aninhadas não é inferível pelo tipo gerado; o mapa
  // abaixo é a única fonte de verdade sobre a forma da linha.
  const row = data as unknown as Record<string, unknown>;
  const room = row.rooms as {
    name?: string;
    slug?: string;
    hourly_price_cents?: number;
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
  const view = {
    id: String(row.id),
    roomName: room?.name ?? "Sala",
    roomSlug: String(room?.slug ?? ""),
    unit: location?.name ?? "Unidade",
    address: [
      location?.address,
      [location?.city, location?.state].filter(Boolean).join("/"),
    ]
      .filter(Boolean)
      .join(" · "),
    startAt: String(row.start_at),
    endAt: String(row.end_at),
    timeZone: location?.timezone ?? "America/Sao_Paulo",
    status: String(row.status),
    totalCents: Number(row.total_cents),
    hourlyPriceCents: Number(room?.hourly_price_cents ?? 0),
    roomId: String(row.room_id),
    credential: {
      status: (credential?.status as AccessStatus | undefined) ?? null,
      validFrom: credential?.valid_from ?? null,
      validUntil: credential?.valid_until ?? null,
      fingerprint: credential?.access_code_fingerprint ?? null,
    },
  };

  return { ...view, extension: await extensionOffer(view) };
}

/**
 * Quanto a reserva ainda pode crescer. O teto é o próximo bloco ocupado menos o
 * tempo de limpeza que a sala precisa antes dele — estender até encostar na
 * próxima reserva entregaria a sala suja para quem vem depois.
 */
async function extensionOffer(
  booking: Omit<BookingDetailView, "extension">,
): Promise<ExtensionOffer | null> {
  if (booking.status !== "confirmed" && booking.status !== "in_progress")
    return null;
  const end = Date.parse(booking.endAt);
  if (end <= Date.now()) return null;

  const room = await availabilityRoomBySlug(booking.roomSlug);
  if (!room) return null;

  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: room.config.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(booking.endAt));
  const closing = zonedInstant(
    day,
    Number(room.config.closingTime.slice(0, 2)) * 60 +
      Number(room.config.closingTime.slice(3, 5)),
    room.config.timeZone,
  ).getTime();

  const busy = (await busyIntervals([room], new Date(end), new Date(closing)))
    .get(room.id)
    ?.filter((interval) => {
      // A própria reserva e a limpeza que a sucede não são obstáculos para
      // quem já está dentro da sala.
      if (interval.kind === "cleaning" && Date.parse(interval.startAt) === end)
        return false;
      return Date.parse(interval.endAt) > end;
    });

  const next = (busy ?? [])
    .map((interval) => Date.parse(interval.startAt))
    .filter((start) => start >= end)
    .sort((a, b) => a - b)[0];

  let ceiling = closing;
  let reason = `O expediente encerra às ${room.config.closingTime}.`;
  if (next !== undefined && next < closing) {
    ceiling = next - room.cleaningMinutes * 60_000;
    reason =
      room.cleaningMinutes > 0
        ? `A sala tem reserva às ${clock(next, room.config.timeZone)} e precisa de ${room.cleaningMinutes} min de preparo antes.`
        : `A sala tem reserva às ${clock(next, room.config.timeZone)}.`;
  }

  const available = Math.floor((ceiling - end) / 60_000);
  const maxMinutes = Math.max(
    0,
    Math.min(
      Math.floor(available / SLOT_MINUTES) * SLOT_MINUTES,
      room.config.maximumMinutes,
    ),
  );
  return {
    maxMinutes,
    minMinutes: room.config.minimumMinutes,
    priceCentsPerSlot: slotPrice(booking),
    reason,
  };
}

const slotPrice = (booking: { hourlyPriceCents: number }) =>
  Math.round((booking.hourlyPriceCents * SLOT_MINUTES) / 60);

const clock = (instant: number, timeZone: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(instant));

export const DEMO_BOOKING_ID = "booking_demo";

/**
 * Reserva de exemplo do modo simulador — mesma forma que o Supabase devolve,
 * ancorada no relógio para a credencial mostrar o estado "ainda não liberado".
 * É a única origem de dados de exemplo do fluxo de reservas do cliente.
 */
export function demoBookingDetail(): BookingDetailView {
  const room = demoRooms[0];
  const start = new Date(Date.now() + 45 * 60_000);
  const end = new Date(start.getTime() + 60 * 60_000);
  return {
    id: DEMO_BOOKING_ID,
    roomName: room.name,
    roomSlug: room.slug,
    unit: room.location,
    address: room.address ?? "",
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    timeZone: "America/Sao_Paulo",
    status: "confirmed",
    totalCents: room.hourlyPriceCents,
    hourlyPriceCents: room.hourlyPriceCents,
    roomId: room.id,
    credential: {
      status: "active",
      validFrom: new Date(start.getTime() - 5 * 60_000).toISOString(),
      validUntil: new Date(end.getTime() + 5 * 60_000).toISOString(),
      fingerprint: "••• 921",
    },
    extension: {
      maxMinutes: 120,
      minMinutes: 60,
      priceCentsPerSlot: Math.round(room.hourlyPriceCents / 2),
      reason: "O expediente encerra às 20:00.",
    },
  };
}
