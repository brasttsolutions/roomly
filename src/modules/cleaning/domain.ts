import type { BookingId, Brand, RoomId } from "@/modules/reservations/domain";

export type CleaningRequestId = Brand<string, "CleaningRequestId">;

export type CleaningPlan =
  | Readonly<{
      kind: "scheduled";
      bookingId: BookingId;
      roomId: RoomId;
      startAt: Date;
      endAt: Date;
    }>
  | Readonly<{
      kind: "manual_review";
      bookingId: BookingId;
      reason: "insufficient_gap";
    }>;

export function planCleaning(input: {
  bookingId: BookingId;
  roomId: RoomId;
  bookingEnd: Date;
  durationMinutes: number;
  nextBookingStart?: Date;
}): CleaningPlan {
  if (input.durationMinutes <= 0) {
    throw new Error("A duracao da limpeza deve ser positiva.");
  }
  const endAt = new Date(
    input.bookingEnd.getTime() + input.durationMinutes * 60_000,
  );
  if (input.nextBookingStart && endAt > input.nextBookingStart) {
    return {
      kind: "manual_review",
      bookingId: input.bookingId,
      reason: "insufficient_gap",
    };
  }
  return {
    kind: "scheduled",
    bookingId: input.bookingId,
    roomId: input.roomId,
    startAt: input.bookingEnd,
    endAt,
  };
}
