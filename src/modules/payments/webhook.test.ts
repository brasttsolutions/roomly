import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validMercadoPagoSignature, validWebhookSignature } from "./webhook";

describe("payment webhook signature", () => {
  const body = '{"id":"evt_1"}';
  const secret = "local-secret";

  it("accepts the exact HMAC payload", () => {
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    expect(validWebhookSignature(body, signature, secret)).toBe(true);
  });

  it("rejects absent, malformed, or payload-mismatched signatures", () => {
    expect(validWebhookSignature(body, null, secret)).toBe(false);
    expect(validWebhookSignature(body, "invalid", secret)).toBe(false);
    const other = createHmac("sha256", secret).update("other").digest("hex");
    expect(validWebhookSignature(body, other, secret)).toBe(false);
  });

  it("validates the Mercado Pago manifest format", () => {
    const timestamp = "1704908010";
    const requestId = "request_1";
    const dataId = "PAYMENT_1";
    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
    const digest = createHmac("sha256", secret).update(manifest).digest("hex");
    expect(
      validMercadoPagoSignature({
        signature: `ts=${timestamp},v1=${digest}`,
        requestId,
        dataId,
        secret,
      }),
    ).toBe(true);
  });
});
