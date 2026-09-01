import { describe, expect, it } from "vitest";
import { createBookingSchema } from "./schemas";

const valid = {
  roomId: "30000000-0000-4000-8000-000000000001",
  startAt: "2030-01-10T14:00:00.000Z",
  endAt: "2030-01-10T15:00:00.000Z",
  paymentMethod: "pix" as const,
  idempotencyKey: "booking-request-0001",
};

describe("create booking input", () => {
  it("accepts a bounded future booking", () => {
    expect(createBookingSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects past bookings", () => {
    const parsed = createBookingSchema.safeParse({
      ...valid,
      startAt: "2020-01-10T14:00:00.000Z",
      endAt: "2020-01-10T15:00:00.000Z",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects non-UUID room identifiers at the boundary", () => {
    expect(
      createBookingSchema.safeParse({ ...valid, roomId: "room-from-client" })
        .success,
    ).toBe(false);
  });
});
