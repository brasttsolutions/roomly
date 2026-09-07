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

  /** Assina uma notificação no formato do MP para um dado instante (epoch s). */
  function assinar(timestamp: number, dataId = "PAYMENT_1") {
    const requestId = "request_1";
    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
    const digest = createHmac("sha256", secret).update(manifest).digest("hex");
    return { signature: `ts=${timestamp},v1=${digest}`, requestId, dataId, secret };
  }

  it("validates the Mercado Pago manifest format", () => {
    const agora = Math.floor(Date.now() / 1000);
    expect(validMercadoPagoSignature(assinar(agora))).toBe(true);
  });

  it("recusa uma assinatura legítima porém velha (proteção contra replay)", () => {
    // Um timestamp de uma hora atrás tem HMAC perfeitamente válido — o que o
    // barra é a janela de tolerância. Sem ela, uma notificação capturada valia
    // para sempre.
    const umaHoraAtras = Math.floor(Date.now() / 1000) - 3600;
    expect(validMercadoPagoSignature(assinar(umaHoraAtras))).toBe(false);
  });
});
