export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type BookingId = Brand<string, "BookingId">;
export type CompanyId = Brand<string, "CompanyId">;
export type RoomId = Brand<string, "RoomId">;
export type UserId = Brand<string, "UserId">;
export type PaymentId = Brand<string, "PaymentId">;

export type TimeRange = Readonly<{
  start: Date;
  end: Date;
}>;

export type Money = Readonly<{
  cents: number;
  currency: "BRL";
}>;

type BookingBase = Readonly<{
  id: BookingId;
  companyId: CompanyId;
  roomId: RoomId;
  userId: UserId;
  slot: TimeRange;
  total: Money;
}>;

export type Booking =
  | (BookingBase & { kind: "held"; expiresAt: Date })
  | (BookingBase & {
      kind: "confirmed";
      paymentId: PaymentId;
      confirmedAt: Date;
    })
  | (BookingBase & { kind: "in_progress"; startedAt: Date })
  | (BookingBase & { kind: "completed"; completedAt: Date })
  | (BookingBase & {
      kind: "cancelled";
      cancelledAt: Date;
      reason: "customer" | "admin" | "payment_failure";
    })
  | (BookingBase & {
      kind: "refunded";
      paymentId: PaymentId;
      refundedAt: Date;
    })
  | (BookingBase & { kind: "expired"; expiredAt: Date });

export type Payment =
  | Readonly<{
      kind: "pending";
      id: PaymentId;
      bookingId: BookingId;
      amount: Money;
    }>
  | Readonly<{
      kind: "approved";
      id: PaymentId;
      bookingId: BookingId;
      amount: Money;
      approvedAt: Date;
    }>
  | Readonly<{
      kind: "rejected";
      id: PaymentId;
      bookingId: BookingId;
      reason: string;
    }>
  | Readonly<{
      kind: "refunded";
      id: PaymentId;
      bookingId: BookingId;
      amount: Money;
      refundedAt: Date;
    }>;

export type PaymentApproval =
  | Readonly<{
      kind: "confirmed";
      booking: Extract<Booking, { kind: "confirmed" }>;
    }>
  | Readonly<{
      kind: "duplicate";
      booking: Extract<Booking, { kind: "confirmed" }>;
    }>
  | Readonly<{
      kind: "manual_review";
      reason: "hold_expired" | "amount_mismatch";
    }>;

export function createTimeRange(start: Date, end: Date): TimeRange {
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start >= end
  ) {
    throw new Error("O horário final deve ser posterior ao horário inicial.");
  }
  return { start: new Date(start), end: new Date(end) };
}

export function rangesOverlap(left: TimeRange, right: TimeRange) {
  return left.start < right.end && left.end > right.start;
}

export function hasConflict(
  candidate: TimeRange,
  activeBookings: readonly Booking[],
  now = new Date(),
) {
  return activeBookings.some((booking) => {
    if (
      booking.kind === "cancelled" ||
      booking.kind === "completed" ||
      booking.kind === "refunded" ||
      booking.kind === "expired"
    )
      return false;
    if (booking.kind === "held" && booking.expiresAt <= now) return false;
    return rangesOverlap(candidate, booking.slot);
  });
}

export function calculatePrice(
  slot: TimeRange,
  hourlyPriceCents: number,
): Money {
  const minutes = (slot.end.getTime() - slot.start.getTime()) / 60_000;
  return {
    cents: Math.round((minutes / 60) * hourlyPriceCents),
    currency: "BRL",
  };
}

export function approvePayment(input: {
  booking: Booking;
  payment: Extract<Payment, { kind: "approved" }>;
  now: Date;
}): PaymentApproval {
  if (input.booking.kind === "confirmed")
    return { kind: "duplicate", booking: input.booking };
  if (input.booking.kind !== "held" || input.booking.expiresAt <= input.now) {
    return { kind: "manual_review", reason: "hold_expired" };
  }
  if (input.payment.amount.cents !== input.booking.total.cents) {
    return { kind: "manual_review", reason: "amount_mismatch" };
  }
  return {
    kind: "confirmed",
    booking: {
      ...input.booking,
      kind: "confirmed",
      paymentId: input.payment.id,
      confirmedAt: input.now,
    },
  };
}

export function canExtendBooking(input: {
  booking: Extract<Booking, { kind: "confirmed" | "in_progress" }>;
  additionalMinutes: number;
  roomBookings: readonly Booking[];
}) {
  const nextSlot = createTimeRange(
    input.booking.slot.end,
    new Date(
      input.booking.slot.end.getTime() + input.additionalMinutes * 60_000,
    ),
  );
  const others = input.roomBookings.filter(
    (booking) => booking.id !== input.booking.id,
  );
  return !hasConflict(nextSlot, others);
}

export function cancelBooking(
  booking: Extract<Booking, { kind: "held" | "confirmed" }>,
  reason: Extract<Booking, { kind: "cancelled" }>["reason"],
  now: Date,
): Extract<Booking, { kind: "cancelled" }> {
  return { ...booking, kind: "cancelled", cancelledAt: now, reason };
}

export function refundPayment(
  booking: Extract<Booking, { kind: "confirmed" }>,
  payment: Extract<Payment, { kind: "approved" }>,
  now: Date,
): {
  booking: Extract<Booking, { kind: "refunded" }>;
  payment: Extract<Payment, { kind: "refunded" }>;
} {
  if (booking.paymentId !== payment.id || booking.id !== payment.bookingId) {
    throw new Error("O pagamento nao pertence a esta reserva.");
  }
  return {
    booking: {
      ...booking,
      kind: "refunded",
      paymentId: payment.id,
      refundedAt: now,
    },
    payment: { ...payment, kind: "refunded", refundedAt: now },
  };
}

export function expireUnpaidBooking(
  booking: Extract<Booking, { kind: "held" }>,
  now: Date,
): Extract<Booking, { kind: "held" | "expired" }> {
  if (booking.expiresAt > now) return booking;
  return { ...booking, kind: "expired", expiredAt: now };
}

export function rescheduleBooking<
  T extends Extract<Booking, { kind: "held" | "confirmed" }>,
>(
  booking: T,
  nextSlot: TimeRange,
  roomBookings: readonly Booking[],
  now: Date,
): T {
  const others = roomBookings.filter((item) => item.id !== booking.id);
  if (hasConflict(nextSlot, others, now)) {
    throw new Error("O novo horario conflita com outra reserva.");
  }
  return { ...booking, slot: nextSlot };
}
