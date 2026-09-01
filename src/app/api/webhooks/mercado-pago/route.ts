import {
  mercadoPagoNotificationSchema,
  paymentWebhookSchema,
} from "@/modules/reservations/schemas";
import { json, requestId } from "@/lib/server/http";
import {
  validMercadoPagoSignature,
  validWebhookSignature,
} from "@/modules/payments/webhook";
import { logEvent } from "@/lib/server/logger";
import { processPaymentEvent } from "@/lib/server/payment-events";
import { paymentProvider } from "@/lib/server/payment-provider";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const id = requestId(request);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 262_144)
    return json({ error: "Payload muito grande." }, 413, id);
  const raw = await request.text();
  if (raw.length > 262_144)
    return json({ error: "Payload muito grande." }, 413, id);
  const realProvider = process.env.ROOMLY_PAYMENT_MODE === "mercado_pago";
  const secret =
    process.env.MERCADO_PAGO_WEBHOOK_SECRET ?? "roomly-local-simulator";
  const url = new URL(request.url);
  const signatureValid = realProvider
    ? validMercadoPagoSignature({
        signature: request.headers.get("x-signature"),
        requestId: request.headers.get("x-request-id"),
        dataId: url.searchParams.get("data.id"),
        secret,
      })
    : validWebhookSignature(
        raw,
        request.headers.get("x-roomly-signature"),
        secret,
      );
  if (!signatureValid) {
    logEvent("warn", "payment_webhook.invalid_signature", { requestId: id });
    return json({ error: "Assinatura inválida." }, 401, id);
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "JSON inválido." }, 400, id);
  }
  try {
    let eventId: string;
    let payment;
    if (realProvider) {
      const parsed = mercadoPagoNotificationSchema.safeParse(body);
      if (!parsed.success) return json({ error: "Evento inválido." }, 422, id);
      eventId = String(parsed.data.id);
      payment = await paymentProvider().fetchPayment(
        String(parsed.data.data.id),
      );
    } else {
      const parsed = paymentWebhookSchema.safeParse(body);
      if (!parsed.success) return json({ error: "Evento inválido." }, 422, id);
      eventId = parsed.data.id;
      payment = {
        externalId: parsed.data.data.id,
        status: parsed.data.data.status,
        amountCents: parsed.data.data.amountCents,
        checkoutReference: `event:${parsed.data.id}`,
      } as const;
    }
    const outcome = await processPaymentEvent({
      eventId,
      payment,
      payload: body,
    });
    logEvent("info", `payment_webhook.${outcome}`, {
      requestId: id,
      eventId,
      status: payment.status,
    });
    return json({ accepted: true, outcome }, 200, id);
  } catch (error) {
    logEvent("error", "payment_webhook.processing_failed", {
      requestId: id,
      error: error instanceof Error ? error.message : "unknown",
    });
    return json({ error: "Falha temporária ao processar evento." }, 503, id);
  }
}
