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
import { paymentMode } from "@/lib/modes";

export const runtime = "nodejs";

const MAX_BODY = 262_144;

/**
 * Lê o corpo abortando assim que passa de `max` bytes, em vez de confiar no
 * header `content-length` (que some num envio `chunked`) e materializar o
 * payload inteiro só para medir depois. Devolve `null` quando estoura.
 */
async function readBounded(request: Request, max: number): Promise<string | null> {
  const stream = request.body;
  if (!stream) return "";
  const reader = stream.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        await reader.cancel();
        return null;
      }
      partes.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder().decode(concat(partes, total));
}

function concat(partes: Uint8Array[], total: number) {
  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const parte of partes) {
    buffer.set(parte, offset);
    offset += parte.byteLength;
  }
  return buffer;
}

export async function POST(request: Request) {
  const id = requestId(request);
  const realProvider = paymentMode() === "mercado_pago";
  // Sem segredo configurado nenhuma assinatura confere. O padrão literal que
  // existia aqui estava no repositório: em modo simulador, qualquer pessoa
  // assinava uma notificação e confirmava reserva sem pagar.
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) {
    logEvent("error", "payment_webhook.secret_missing", { requestId: id });
    return json({ error: "Assinatura inválida." }, 401, id);
  }
  const url = new URL(request.url);
  // O id de pagamento ASSINADO vem do query string — é o único valor de
  // conteúdo que a assinatura do Mercado Pago cobre. Tudo mais chega no corpo,
  // que não é assinado, e por isso não pode decidir qual pagamento processar.
  const signedDataId = url.searchParams.get("data.id");

  // A assinatura do MP cobre só cabeçalhos e o `data.id` do query — não o corpo.
  // Então ela é conferida ANTES de ler o corpo: um pedido sem assinatura válida
  // é recusado sem que o servidor materialize um byte do payload, fechando o
  // vetor de bufferizar megabytes num endpoint público via `Transfer-Encoding:
  // chunked` (que zera o header `content-length`).
  if (realProvider) {
    const ok = validMercadoPagoSignature({
      signature: request.headers.get("x-signature"),
      requestId: request.headers.get("x-request-id"),
      dataId: signedDataId,
      secret,
    });
    if (!ok) {
      logEvent("warn", "payment_webhook.invalid_signature", { requestId: id });
      return json({ error: "Assinatura inválida." }, 401, id);
    }
  }

  // Leitura com teto de bytes real, independente do header `content-length`.
  const raw = await readBounded(request, MAX_BODY);
  if (raw === null)
    return json({ error: "Payload muito grande." }, 413, id);

  if (!realProvider) {
    // O provedor de simulação assina o CORPO, então precisa dele em mãos antes.
    const ok = validWebhookSignature(
      raw,
      request.headers.get("x-roomly-signature"),
      secret,
    );
    if (!ok) {
      logEvent("warn", "payment_webhook.invalid_signature", { requestId: id });
      return json({ error: "Assinatura inválida." }, 401, id);
    }
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
      // O corpo tem que concordar com o que foi assinado. Um atacante de posse
      // de uma notificação legítima não consegue trocar o `data.id` do corpo
      // para apontar o processamento a outro pagamento: aqui a divergência é
      // recusada, e a busca usa sempre o id assinado do query.
      if (!signedDataId || String(parsed.data.data.id) !== signedDataId) {
        logEvent("warn", "payment_webhook.data_id_mismatch", { requestId: id });
        return json({ error: "Evento inválido." }, 422, id);
      }
      eventId = String(parsed.data.id);
      payment = await paymentProvider().fetchPayment(signedDataId);
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
