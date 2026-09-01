import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0001_roomly_foundation.sql"),
  "utf8",
);

describe("database foundation migration", () => {
  it("enforces room allocation with a half-open exclusion constraint", () => {
    expect(migration).toContain("exclude using gist");
    expect(migration).toContain("tstzrange(start_at, end_at, '[)')");
    expect(migration).toContain("constraint bookings_no_room_overlap");
    expect(migration).toContain("slot with &&");
  });

  it("enables RLS on every tenant-sensitive workflow table", () => {
    for (const table of [
      "bookings",
      "payments",
      "payment_events",
      "booking_access_codes",
      "durable_jobs",
      "cleaning_requests",
      "notifications",
      "audit_logs",
    ]) {
      expect(migration).toContain(
        `alter table public.${table} enable row level security`,
      );
    }
  });

  it("qualifies outer policy columns and checks booking profile ownership", () => {
    expect(migration).toContain("p.id=bookings.user_id");
    expect(migration).toContain("b.id=payments.booking_id");
    expect(migration).toContain("b.id=booking_access_codes.booking_id");
    expect(migration).toContain("p.id=notifications.user_id");
    expect(migration).toContain("profile_access_denied");
    expect(migration).toContain("computed_subtotal := round");
    expect(migration).toContain("booking_must_be_in_future");
    expect(migration).toContain("public.can_invite_role(company_id,role)");
    expect(migration).toContain("record_pending_payment");
    expect(migration).toContain(
      "grant execute on function public.create_booking_hold",
    );
    expect(migration).toContain("for update skip locked");
    expect(migration).toContain(
      "grant execute on function public.claim_durable_jobs(integer) to service_role",
    );
    expect(migration).toContain(
      "grant execute on function public.consume_rate_limit(text,integer,integer) to authenticated",
    );
  });
});
