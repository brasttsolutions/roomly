import { describe, expect, it } from "vitest";
import {
  calculateAccessWindow,
  nextAccessAction,
  nextRevocationAction,
  recordProvisionFailure,
  type LockId,
} from "./domain";
import { createTimeRange, type BookingId } from "@/modules/reservations/domain";

describe("access domain", () => {
  it("adds the configured access tolerance around the booking", () => {
    const slot = createTimeRange(
      new Date("2026-09-01T14:00:00Z"),
      new Date("2026-09-01T15:00:00Z"),
    );
    expect(calculateAccessWindow(slot, 5, 5)).toEqual({
      start: new Date("2026-09-01T13:55:00Z"),
      end: new Date("2026-09-01T15:05:00Z"),
    });
  });

  it("reconciles an ambiguous timeout instead of creating another code", () => {
    expect(
      nextAccessAction({
        kind: "timeout_unknown",
        operationKey: "access:booking_1",
      }),
    ).toEqual({
      kind: "reconcile",
      operationKey: "access:booking_1",
    });
  });

  it("retries after a gateway outage without losing the operation", () => {
    const retryAt = new Date("2026-09-01T13:02:00Z");
    expect(nextAccessAction({ kind: "offline", retryAt })).toEqual({
      kind: "retry",
      retryAt,
    });
  });

  it("escalates repeated password generation failures", () => {
    const pending = {
      kind: "pending" as const,
      bookingId: "booking_1" as BookingId,
      lockId: "lock_1" as LockId,
      attempt: 2,
    };
    expect(recordProvisionFailure(pending, 3)).toMatchObject({
      kind: "failed",
      attempt: 3,
      resolution: "manual_review",
    });
  });

  it("sends a rejected password revocation to manual review", () => {
    expect(
      nextRevocationAction({ kind: "rejected", reason: "lock_busy" }),
    ).toEqual({ kind: "manual_review", reason: "lock_busy" });
  });
});
