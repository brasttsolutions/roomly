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
    });
    return true;
  } catch {
    return false;
  }
}
