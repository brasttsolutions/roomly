import { createHmac, timingSafeEqual } from "node:crypto";
import { WebhookSignatureValidator } from "mercadopago";

export function validWebhookSignature(
  body: string,
  provided: string | null,
  secret: string,
) {
  if (!provided || provided.length !== 64) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(provided, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Janela de tolerância do timestamp assinado. Sem ela, uma notificação legítima
 * capturada uma vez valia para sempre: bastava reenviar o mesmo trio de
 * cabeçalhos para reprocessar um pagamento a qualquer momento. Cinco minutos
 * cobre o atraso normal de entrega e reentrega do Mercado Pago.
 */
const TOLERANCIA_SEGUNDOS = 300;

export function validMercadoPagoSignature(input: {
  signature: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
}) {
  try {
    WebhookSignatureValidator.validate({
      xSignature: input.signature,
      xRequestId: input.requestId,
      dataId: input.dataId,
      secret: input.secret,
      toleranceSeconds: TOLERANCIA_SEGUNDOS,
    });
    return true;
  } catch {
    return false;
  }
}
