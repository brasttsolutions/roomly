import { createBookingSchema } from "@/modules/reservations/schemas";
import {
  createBooking,
  PaymentFailedAfterHold,
} from "@/modules/reservations/application";
import { bookingRepository } from "@/lib/server/booking-repository";
import { paymentProvider } from "@/lib/server/payment-provider";
import { clientAddress, json, rateLimit, requestId } from "@/lib/server/http";
import { requestCustomer } from "@/lib/server/customer";
import { logEvent } from "@/lib/server/logger";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const id = requestId(request);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 32_768)
    return json({ error: "Payload muito grande." }, 413, id);
  if (!rateLimit(`bookings:${clientAddress(request)}`, 12)) {
    logEvent("warn", "booking.rate_limited", { requestId: id });
    return json({ error: "Muitas tentativas. Aguarde um minuto." }, 429, id);
  }
  const customer = await requestCustomer();
  if (!customer) {
    logEvent("warn", "booking.unauthorized", { requestId: id });
    return json({ error: "Autenticação necessária." }, 401, id);
  }
  if (integrationMode() === "supabase") {
    const supabase = await createSupabaseServerClient();
    const { data: allowed, error: limiterError } = await supabase.rpc(
      "consume_rate_limit",
      {
        target_scope: "bookings.create",
        target_limit: 12,
        target_window_seconds: 60,
      },
    );
    if (limiterError || !allowed) {
      logEvent("warn", "booking.rate_limited_distributed", { requestId: id });
      return json({ error: "Muitas tentativas. Aguarde um minuto." }, 429, id);
    }
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "JSON inválido." }, 400, id);
  }
  const parsed = createBookingSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.flatten().fieldErrors;
    return json({ error: describeIssues(issues), issues }, 422, id);
  }
  try {
    const result = await createBooking(bookingRepository(), paymentProvider(), {
      customerId: customer.id,
      payerEmail: customer.email,
      ...parsed.data,
    });
    logEvent(
      "info",
      result.duplicate ? "booking.duplicate" : "booking.hold_created",
      {
        requestId: id,
        bookingId: result.booking.id,
        companyId: customer.id,
        roomId: result.booking.roomId,
      },
    );
    return json(
      {
        booking: result.booking,
        checkout: result.checkout,
        duplicate: result.duplicate || undefined,
        holdExpiresAt: result.booking.holdExpiresAt,
      },
      result.duplicate ? 200 : 201,
      id,
    );
  } catch (error) {
    logEvent("error", "booking.create_failed", {
      requestId: id,
      error: error instanceof Error ? error.message : "unknown",
      // Sem a causa, toda falha de cobrança vira a mesma linha de log e não dá
      // para distinguir cartão recusado de credencial errada do provedor.
      cause:
        error instanceof Error && error.cause instanceof Error
          ? error.cause.message
          : undefined,
    });
    if (error instanceof PaymentFailedAfterHold) {
      return json(
        {
          error:
            "Não foi possível concluir o pagamento. Seu horário segue reservado enquanto o contador estiver correndo.",
          holdExpiresAt: error.holdExpiresAt,
        },
        503,
        id,
      );
    }
    return json({ error: "Não foi possível concluir a reserva." }, 503, id);
  }
}

/** Nomes dos campos como a pessoa os vê na tela, não como o schema os chama. */
const FIELD_LABELS: Record<string, string> = {
  roomId: "Sala",
  startAt: "Início",
  endAt: "Término",
  paymentMethod: "Forma de pagamento",
  cardToken: "Dados do cartão",
  paymentMethodId: "Bandeira do cartão",
  issuerId: "Emissor do cartão",
  installments: "Parcelas",
  idempotencyKey: "Identificador da tentativa",
};

/**
 * "Dados inválidos" obriga a pessoa a adivinhar qual campo corrigir (WCAG
 * 3.3.3). A mensagem nomeia o campo e diz o que se espera dele.
 */
function describeIssues(issues: Record<string, string[] | undefined>) {
  const described = Object.entries(issues)
    .map(([field, messages]) => {
      const message = messages?.[0];
      if (!message) return null;
      return `${FIELD_LABELS[field] ?? field}: ${message}`;
    })
    .filter(Boolean);
  return described.length > 0
    ? described.join(" ")
    : "Não foi possível validar os dados da reserva.";
}
