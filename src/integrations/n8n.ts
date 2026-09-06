import "server-only";
import { createHmac } from "node:crypto";

export async function notifyCleaningAutomation(input: {
  /** Telefone da equipe de limpeza, para o fluxo não guardar isso fixo. */
  contactPhone?: string | null;
  bookingId: string;
  companyId: string;
  roomId: string;
  scheduledAt: string;
  idempotencyKey: string;
}) {
  const url = process.env.N8N_WEBHOOK_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!url || !secret) throw new Error("n8n_not_configured");
  const body = JSON.stringify({
    event: "cleaning.requested",
    contactPhone: input.contactPhone ?? null,
    bookingId: input.bookingId,
    companyId: input.companyId,
    roomId: input.roomId,
    scheduledAt: input.scheduledAt,
  });
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-roomly-signature": signature,
      "idempotency-key": input.idempotencyKey,
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`n8n_http_${response.status}`);
}
