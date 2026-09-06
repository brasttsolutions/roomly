import "server-only";
import { paymentMode } from "@/lib/modes";
import type { PaymentProvider } from "@/integrations/contracts";
import { MercadoPagoProvider } from "@/integrations/mercado-pago";
import { MercadoPagoSimulator } from "@/integrations/simulators";

let provider: PaymentProvider | undefined;

export function paymentProvider() {
  if (provider) return provider;
  if (paymentMode() === "mercado_pago") {
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!token) throw new Error("MERCADO_PAGO_ACCESS_TOKEN is required.");
    provider = new MercadoPagoProvider(token);
  } else {
    provider = new MercadoPagoSimulator();
  }
  return provider;
}
