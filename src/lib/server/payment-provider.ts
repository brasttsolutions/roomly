import "server-only";
import { paymentMode } from "@/lib/modes";
import type { PaymentProvider } from "@/integrations/contracts";
import { MercadoPagoProvider } from "@/integrations/mercado-pago";
import { MercadoPagoSimulator } from "@/integrations/simulators";
import { integrationMode } from "@/lib/supabase/config";

let provider: PaymentProvider | undefined;

export function paymentProvider() {
  if (provider) return provider;
  if (paymentMode() === "mercado_pago") {
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!token) throw new Error("MERCADO_PAGO_ACCESS_TOKEN is required.");
    provider = new MercadoPagoProvider(token);
  } else {
    // Mesma trava que o provedor de acesso já tinha. Sem ela, um deploy que
    // esquecesse `ROOMLY_PAYMENT_MODE` aprovava reserva sem cobrar ninguém,
    // contra o banco de produção.
    if (
      process.env.NODE_ENV === "production" &&
      integrationMode() === "supabase"
    ) {
      throw new Error("payment_simulator_forbidden_in_production");
    }
    provider = new MercadoPagoSimulator();
  }
  return provider;
}
