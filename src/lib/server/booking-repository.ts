import "server-only";
import { randomUUID } from "node:crypto";
import type {
  BookingCommand,
  BookingRecord,
  BookingRepository,
} from "@/modules/reservations/application";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const state = globalThis as typeof globalThis & {
  roomlyBookings?: Map<string, BookingRecord>;
};
const demoBookings = (state.roomlyBookings ??= new Map());
const demoPrices: Record<string, number> = {
  "30000000-0000-4000-8000-000000000001": 12000,
  "30000000-0000-4000-8000-000000000002": 7500,
  "30000000-0000-4000-8000-000000000003": 16500,
};

class SimulatorBookingRepository implements BookingRepository {
  async createHold(command: BookingCommand) {
    const existing = demoBookings.get(command.idempotencyKey);
    if (existing) return { booking: existing, duplicate: true };
    const minutes =
      (new Date(command.endAt).getTime() -
        new Date(command.startAt).getTime()) /
      60_000;
    const booking: BookingRecord = {
      id: `booking_${randomUUID().slice(0, 8)}`,
      companyId: command.companyId,
      userId: command.profileId,
      roomId: command.roomId,
      startAt: command.startAt,
      endAt: command.endAt,
      status: "awaiting_payment",
      amountCents: Math.round(
        (minutes / 60) * (demoPrices[command.roomId] ?? 12000),
      ),
    };
    demoBookings.set(command.idempotencyKey, booking);
    return { booking, duplicate: false };
  }

  async recordPendingPayment(input: {
    booking: BookingRecord;
    externalPaymentId: string;
    idempotencyKey: string;
  }) {
    demoBookings.set(input.idempotencyKey, {
      ...input.booking,
      paymentId: input.externalPaymentId,
    });
  }
}

class SupabaseBookingRepository implements BookingRepository {
  async createHold(command: BookingCommand) {
    const supabase = await createSupabaseServerClient();
    const existing = await this.findExisting(command.idempotencyKey);
    if (existing) return { booking: existing, duplicate: true };

    const { data, error } = await supabase.rpc("create_booking_hold", {
      target_company_id: command.companyId,
      target_location_id: await this.locationId(command.roomId),
      target_room_id: command.roomId,
      target_user_id: command.profileId,
      target_start_at: command.startAt,
      target_end_at: command.endAt,
      target_idempotency_key: command.idempotencyKey,
    });
    if (error) {
      if (error.code === "23505") {
        const raced = await this.findExisting(command.idempotencyKey);
        if (raced) return { booking: raced, duplicate: true };
      }
      throw new Error(`booking_hold_failed:${error.code ?? "unknown"}`);
    }
    return { booking: mapBooking(data), duplicate: false };
  }

  async recordPendingPayment(input: {
    booking: BookingRecord;
    externalPaymentId: string;
    paymentMethod: "pix" | "card";
    idempotencyKey: string;
  }) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("record_pending_payment", {
      target_booking_id: input.booking.id,
      target_provider_payment_id: input.externalPaymentId,
      target_payment_method: input.paymentMethod,
      target_idempotency_key: input.idempotencyKey,
    });
    if (error && error.code !== "23505") {
      throw new Error(`payment_record_failed:${error.code ?? "unknown"}`);
    }
  }

  private async locationId(roomId: string) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("rooms")
      .select("location_id")
      .eq("id", roomId)
      .eq("status", "active")
      .single();
    if (error || !data) throw new Error("room_not_found");
    return data.location_id;
  }

  private async findExisting(idempotencyKey: string) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id,company_id,user_id,room_id,start_at,end_at,status,total_cents,payments(provider_payment_id)",
      )
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (error) throw new Error(`booking_lookup_failed:${error.code}`);
    return data ? mapBooking(data) : null;
  }
}

function mapBooking(data: Record<string, unknown>): BookingRecord {
  const payments = data.payments as
    Array<{ provider_payment_id: string | null }> | undefined;
  return {
    id: String(data.id),
    companyId: String(data.company_id),
    userId: String(data.user_id),
    roomId: String(data.room_id),
    startAt: String(data.start_at),
    endAt: String(data.end_at),
    status: "awaiting_payment",
    amountCents: Number(data.total_cents),
    paymentId: payments?.[0]?.provider_payment_id ?? undefined,
  };
}

export function bookingRepository(): BookingRepository {
  return integrationMode() === "supabase"
    ? new SupabaseBookingRepository()
    : new SimulatorBookingRepository();
}

/**
 * Reservas do simulador, para a disponibilidade enxergar os holds criados em
 * memória. Sem isto o modo simulador mostraria todo dia inteiramente livre.
 */
export function simulatorBookings(): readonly BookingRecord[] {
  return [...demoBookings.values()];
}
