import "server-only";
import type { ChargeResult } from "@/integrations/contracts";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const state = globalThis as typeof globalThis & {
  roomlyPaymentEvents?: Set<string>;
};
const demoEvents = (state.roomlyPaymentEvents ??= new Set<string>());

export async function processPaymentEvent(input: {
  eventId: string;
  payment: ChargeResult;
  payload: unknown;
}) {
  if (integrationMode() === "simulator") {
    if (demoEvents.has(input.eventId)) return "duplicate" as const;
    demoEvents.add(input.eventId);
    return input.payment.status === "approved"
      ? ("booking_confirmed" as const)
      : ("payment_updated" as const);
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("process_payment_event", {
    target_external_event_id: input.eventId,
    target_provider_payment_id: input.payment.externalId,
    target_status: input.payment.status,
    target_amount_cents: input.payment.amountCents ?? 0,
    target_payload: input.payload,
  });
  if (error) throw new Error(`payment_event_failed:${error.code ?? "unknown"}`);
  return String(data);
}
