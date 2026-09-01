import { describe, expect, it } from "vitest";
import {
  approvePayment,
  cancelBooking,
  canExtendBooking,
  createTimeRange,
  expireUnpaidBooking,
  hasConflict,
  rangesOverlap,
  refundPayment,
  rescheduleBooking,
  type Booking,
  type BookingId,
  type CompanyId,
  type PaymentId,
  type RoomId,
  type UserId,
} from "./domain";

const at = (hour: number, minute = 0) =>
  new Date(Date.UTC(2026, 8, 1, hour, minute));
const ids = {
  booking: "booking_1" as BookingId,
  company: "company_1" as CompanyId,
  room: "room_1" as RoomId,
  user: "user_1" as UserId,
};

const held: Booking = {
  kind: "held",
  id: ids.booking,
  companyId: ids.company,
  roomId: ids.room,
  userId: ids.user,
  slot: createTimeRange(at(14), at(15)),
  total: { cents: 12000, currency: "BRL" },
  expiresAt: at(13, 10),
};

describe("reservation domain", () => {
  it("uses half-open ranges so adjacent bookings do not conflict", () => {
    expect(
      rangesOverlap(
        createTimeRange(at(14), at(15)),
        createTimeRange(at(15), at(16)),
      ),
    ).toBe(false);
  });

  it("detects two users competing for the same room and time", () => {
    expect(
      hasConflict(createTimeRange(at(14, 30), at(15, 30)), [held], at(13)),
    ).toBe(true);
  });

  it("ignores an expired hold", () => {
    expect(
      hasConflict(createTimeRange(at(14), at(15)), [held], at(13, 11)),
    ).toBe(false);
  });

  it("confirms an approved payment once", () => {
    const payment = {
      kind: "approved" as const,
      id: "payment_1" as PaymentId,
      bookingId: ids.booking,
      amount: held.total,
      approvedAt: at(13, 5),
    };
    const first = approvePayment({ booking: held, payment, now: at(13, 5) });
    expect(first.kind).toBe("confirmed");
    if (first.kind !== "confirmed") return;
    expect(
      approvePayment({ booking: first.booking, payment, now: at(13, 6) }).kind,
    ).toBe("duplicate");
  });

  it("sends payment approved after hold expiry to manual review", () => {
    const payment = {
      kind: "approved" as const,
      id: "payment_1" as PaymentId,
      bookingId: ids.booking,
      amount: held.total,
      approvedAt: at(13, 11),
    };
    expect(approvePayment({ booking: held, payment, now: at(13, 11) })).toEqual(
      { kind: "manual_review", reason: "hold_expired" },
    );
  });

  it("blocks an extension when the next booking starts", () => {
    const confirmed = {
      ...held,
      kind: "confirmed" as const,
      paymentId: "payment_1" as PaymentId,
      confirmedAt: at(13),
    };
    const next = {
      ...confirmed,
      id: "booking_2" as BookingId,
      slot: createTimeRange(at(15, 30), at(16, 30)),
    };
    expect(
      canExtendBooking({
        booking: confirmed,
        additionalMinutes: 60,
        roomBookings: [confirmed, next],
      }),
    ).toBe(false);
  });

  it("cancels a booking and releases its time range", () => {
    const cancelled = cancelBooking(held, "customer", at(13, 2));
    expect(cancelled.kind).toBe("cancelled");
    expect(
      hasConflict(createTimeRange(at(14), at(15)), [cancelled], at(13, 3)),
    ).toBe(false);
  });

  it("refunds only the approved payment linked to the booking", () => {
    const payment = {
      kind: "approved" as const,
      id: "payment_1" as PaymentId,
      bookingId: ids.booking,
      amount: held.total,
      approvedAt: at(13, 5),
    };
    const approval = approvePayment({ booking: held, payment, now: at(13, 5) });
    if (approval.kind !== "confirmed") throw new Error("Expected confirmation");
    const result = refundPayment(approval.booking, payment, at(13, 8));
    expect(result.booking.kind).toBe("refunded");
    expect(result.payment.kind).toBe("refunded");
  });

  it("expires a booking that was not paid before the hold deadline", () => {
    expect(expireUnpaidBooking(held, at(13, 11)).kind).toBe("expired");
    expect(expireUnpaidBooking(held, at(13, 9)).kind).toBe("held");
  });

  it("allows an administrator to move a booking only to a free range", () => {
    const moved = rescheduleBooking(
      held,
      createTimeRange(at(16), at(17)),
      [held],
      at(13),
    );
    expect(moved.slot).toEqual(createTimeRange(at(16), at(17)));
    expect(() =>
      rescheduleBooking(
        held,
        createTimeRange(at(14, 30), at(15, 30)),
        [
          held,
          { ...held, id: "booking_2" as BookingId, expiresAt: at(13, 20) },
        ],
        at(13),
      ),
    ).toThrow(/conflita/);
  });
});
