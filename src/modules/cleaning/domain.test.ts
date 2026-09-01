import { describe, expect, it } from "vitest";
import { type BookingId, type RoomId } from "@/modules/reservations/domain";
import { planCleaning } from "./domain";

const input = {
  bookingId: "booking_1" as BookingId,
  roomId: "room_1" as RoomId,
  bookingEnd: new Date("2026-09-01T15:00:00Z"),
  durationMinutes: 20,
};

describe("cleaning domain", () => {
  it("schedules cleaning immediately after a completed booking", () => {
    expect(planCleaning(input)).toEqual({
      kind: "scheduled",
      bookingId: input.bookingId,
      roomId: input.roomId,
      startAt: input.bookingEnd,
      endAt: new Date("2026-09-01T15:20:00Z"),
    });
  });

  it("requires manual review when the next booking leaves no cleaning gap", () => {
    expect(
      planCleaning({
        ...input,
        nextBookingStart: new Date("2026-09-01T15:10:00Z"),
      }),
    ).toEqual({
      kind: "manual_review",
      bookingId: input.bookingId,
      reason: "insufficient_gap",
    });
  });
});
