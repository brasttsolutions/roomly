import type {
  BookingId,
  Brand,
  TimeRange,
} from "@/modules/reservations/domain";

export type LockId = Brand<string, "LockId">;

export type AccessCredential =
  | Readonly<{
      kind: "pending";
      bookingId: BookingId;
      lockId: LockId;
      attempt: number;
    }>
  | Readonly<{
      kind: "active";
      bookingId: BookingId;
      lockId: LockId;
      validFor: TimeRange;
      maskedCode: string;
    }>
  | Readonly<{
      kind: "failed";
      bookingId: BookingId;
      lockId: LockId;
      attempt: number;
      resolution: "retry" | "manual_review";
    }>
  | Readonly<{
      kind: "revoked";
      bookingId: BookingId;
      lockId: LockId;
      revokedAt: Date;
    }>;

export function calculateAccessWindow(
  slot: TimeRange,
  beforeMinutes: number,
  afterMinutes: number,
): TimeRange {
  return {
    start: new Date(slot.start.getTime() - beforeMinutes * 60_000),
    end: new Date(slot.end.getTime() + afterMinutes * 60_000),
  };
}

export type CreateCodeOutcome =
  | Readonly<{ kind: "created"; externalCodeId: string }>
  | Readonly<{ kind: "timeout_unknown"; operationKey: string }>
  | Readonly<{ kind: "offline"; retryAt: Date }>;

export function nextAccessAction(outcome: CreateCodeOutcome) {
  switch (outcome.kind) {
    case "created":
      return {
        kind: "activate" as const,
        externalCodeId: outcome.externalCodeId,
      };
    case "timeout_unknown":
      return { kind: "reconcile" as const, operationKey: outcome.operationKey };
    case "offline":
      return { kind: "retry" as const, retryAt: outcome.retryAt };
    default: {
      const exhaustive: never = outcome;
      return exhaustive;
    }
  }
}

export function recordProvisionFailure(
  credential: Extract<AccessCredential, { kind: "pending" }>,
  maxAttempts: number,
): Extract<AccessCredential, { kind: "failed" }> {
  const attempt = credential.attempt + 1;
  return {
    ...credential,
    kind: "failed",
    attempt,
    resolution: attempt >= maxAttempts ? "manual_review" : "retry",
  };
}

export type RevokeCodeOutcome =
  | Readonly<{ kind: "revoked"; revokedAt: Date }>
  | Readonly<{ kind: "offline"; retryAt: Date }>
  | Readonly<{ kind: "rejected"; reason: string }>;

export function nextRevocationAction(outcome: RevokeCodeOutcome) {
  switch (outcome.kind) {
    case "revoked":
      return { kind: "complete" as const, revokedAt: outcome.revokedAt };
    case "offline":
      return { kind: "retry" as const, retryAt: outcome.retryAt };
    case "rejected":
      return { kind: "manual_review" as const, reason: outcome.reason };
    default: {
      const exhaustive: never = outcome;
      return exhaustive;
    }
  }
}
