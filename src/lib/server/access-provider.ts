import "server-only";
import { accessMode } from "@/lib/modes";
import type { AccessProvider } from "@/integrations/contracts";
import { TTLockSimulator } from "@/integrations/simulators";
import { integrationMode } from "@/lib/supabase/config";

let provider: AccessProvider | undefined;

export function accessProvider() {
  if (provider) return provider;
  if (accessMode() !== "simulator") {
    throw new Error("ttlock_provider_requires_completed_physical_poc");
  }
  if (
    process.env.NODE_ENV === "production" &&
    integrationMode() === "supabase"
  ) {
    throw new Error("access_simulator_forbidden_in_production");
  }
  provider = new TTLockSimulator();
  return provider;
}
