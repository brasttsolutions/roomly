import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  integrationMode,
  requireSupabasePublicConfig,
} from "@/lib/supabase/config";
import { rooms as demoRooms } from "@/lib/demo-data";
import { BOOKING_TIME_ZONE } from "@/lib/utils";
import type {
  AvailabilityConfig,
  BusyInterval,
} from "@/modules/availability/domain";
import { simulatorBookings } from "./booking-repository";

export type AvailabilityRoom = Readonly<{
  id: string;
  slug: string;
  name: string;
  locationName: string;
  cleaningMinutes: number;
  config: AvailabilityConfig;
}>;

/** Expediente e limites usados quando o simulador responde. */
const SIMULATOR_CONFIG: AvailabilityConfig = {
  timeZone: BOOKING_TIME_ZONE,
  openingTime: "08:00",
  closingTime: "20:00",
  minimumMinutes: 60,
  maximumMinutes: 240,
};
const SIMULATOR_CLEANING_MINUTES = 20;

function anonClient() {
  const config = requireSupabasePublicConfig();
  return createClient(config.url, config.anonKey, {
    auth: { persistSession: false },
  });
}

export async function availabilityRooms(): Promise<readonly AvailabilityRoom[]> {
  if (integrationMode() === "simulator") {
    return demoRooms.map((room) => ({
      id: room.id,
      slug: room.slug,
      name: room.name,
      locationName: room.location,
      cleaningMinutes: SIMULATOR_CLEANING_MINUTES,
      config: SIMULATOR_CONFIG,
    }));
  }
  const { data, error } = await anonClient()
    .from("rooms")
    .select(
      "id,slug,name,cleaning_time_minutes,minimum_booking_minutes,maximum_booking_minutes,locations(name,timezone,opening_time,closing_time)",
    )
    .eq("status", "active")
    .order("name");
  if (error) throw new Error(`availability_rooms_failed:${error.code}`);
  return (data ?? []).map((row) => {
    const location = row.locations as unknown as {
      name?: string;
      timezone?: string;
      opening_time?: string;
      closing_time?: string;
    } | null;
    return {
      id: String(row.id),
      slug: String(row.slug),
      name: String(row.name),
      locationName: location?.name ?? "Unidade",
      cleaningMinutes: Number(row.cleaning_time_minutes ?? 0),
      config: {
        timeZone: location?.timezone ?? BOOKING_TIME_ZONE,
        openingTime: (location?.opening_time ?? "08:00").slice(0, 5),
        closingTime: (location?.closing_time ?? "20:00").slice(0, 5),
        minimumMinutes: Number(row.minimum_booking_minutes),
        maximumMinutes: Number(row.maximum_booking_minutes),
      },
    };
  });
}

export async function availabilityRoomBySlug(slug: string) {
  return (await availabilityRooms()).find((room) => room.slug === slug) ?? null;
}

/**
 * Intervalos ocupados por sala, agrupados por `id`. No Supabase vem da função
 * `room_busy_intervals`, que expõe só o intervalo e o motivo — a RLS de
 * `bookings` continua fechada para quem não é dono nem gestor.
 */
export async function busyIntervals(
  rooms: readonly AvailabilityRoom[],
  from: Date,
  to: Date,
): Promise<Map<string, BusyInterval[]>> {
  const grouped = new Map<string, BusyInterval[]>();
  for (const room of rooms) grouped.set(room.id, []);
  if (rooms.length === 0) return grouped;

  if (integrationMode() === "simulator") {
    const byId = new Map(rooms.map((room) => [room.id, room]));
    for (const booking of simulatorBookings()) {
      const room = byId.get(booking.roomId);
      if (!room) continue;
      const bucket = grouped.get(room.id);
      if (!bucket) continue;
      push(bucket, booking.startAt, booking.endAt, "booked", from, to);
      if (room.cleaningMinutes > 0) {
        const end = new Date(booking.endAt).getTime();
        push(
          bucket,
          booking.endAt,
          new Date(end + room.cleaningMinutes * 60_000).toISOString(),
          "cleaning",
          from,
          to,
        );
      }
    }
    return grouped;
  }

  const { data, error } = await anonClient().rpc("room_busy_intervals", {
    target_room_ids: rooms.map((room) => room.id),
    target_from: from.toISOString(),
    target_to: to.toISOString(),
  });
  if (error) throw new Error(`availability_busy_failed:${error.code}`);
  for (const row of (data ?? []) as Array<{
    room_id: string;
    start_at: string;
    end_at: string;
    kind: BusyInterval["kind"];
  }>) {
    grouped.get(row.room_id)?.push({
      startAt: row.start_at,
      endAt: row.end_at,
      kind: row.kind,
    });
  }
  return grouped;
}

function push(
  bucket: BusyInterval[],
  startAt: string,
  endAt: string,
  kind: BusyInterval["kind"],
  from: Date,
  to: Date,
) {
  if (Date.parse(startAt) >= to.getTime()) return;
  if (Date.parse(endAt) <= from.getTime()) return;
  bucket.push({ startAt, endAt, kind });
}
