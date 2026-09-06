import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { paymentProvider } from "@/lib/server/payment-provider";
import { accessProvider } from "@/lib/server/access-provider";
import { sendBookingEmail } from "@/integrations/resend";
import { renderBookingConfirmed } from "@/modules/notifications/booking-email";
import { appBaseUrl, appBaseUrlIsPublic } from "@/lib/app-url";
import { notifyCleaningAutomation } from "@/integrations/n8n";
import { logEvent } from "@/lib/server/logger";

type Job = {
  id: string;
  company_id: string;
  kind: string;
  payload: Record<string, unknown>;
  attempts: number;
  dedupe_key: string;
};

type AccessContext = Readonly<{
  companyId: string;
  lockId: string;
  validFrom: Date;
  validUntil: Date;
}>;

const manualReviewErrors = new Set([
  "access_external_code_missing",
  "access_reconcile_enqueue_failed",
  "access_reconcile_ambiguous",
  "booking_not_found",
  "lock_not_found",
  "notification_destination_not_found",
  "payment_not_found",
  // Erro de configuração não melhora com nova tentativa: sem isto, um envio de
  // e-mail sem chave repetia oito vezes com espera crescente — mais de uma hora
  // — antes de aparecer para alguém em "Precisa de atenção".
  "resend_not_configured",
  // Recusa do provedor por configuração — domínio não verificado, remetente
  // inválido, chave sem permissão. Repetir não conserta nenhuma delas.
  "resend_rejected",
  "ttlock_provider_requires_completed_physical_poc",
]);

export async function runDueJobs(limit = 10) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("claim_durable_jobs", {
    target_limit: Math.max(1, Math.min(limit, 50)),
  });
  if (error) throw new Error("job_claim_failed");
  const results: Array<{ id: string; status: string }> = [];
  for (const job of (data ?? []) as Job[]) {
    try {
      await processJob(job);
      // `attempts` é a marca de posse: o claim incrementa, então o worker cujo
      // lease venceu carrega um número que já não vale e a escrita dele não
      // pega.
      const { error: completeError } = await supabase.rpc(
        "complete_durable_job",
        { target_job_id: job.id, target_attempts: job.attempts },
      );
      if (completeError) throw new Error("job_complete_failed");
      results.push({ id: job.id, status: "completed" });
    } catch (cause) {
      const code = errorCode(cause);
      // O código pode carregar o detalhe do provedor depois de `:`; a decisão
      // de repetir olha só a família do erro.
      const manualReview = manualReviewErrors.has(code.split(":")[0]);
      await supabase.rpc("retry_durable_job", {
        target_job_id: job.id,
        target_error_code: code,
        target_manual_review: manualReview,
        target_attempts: job.attempts,
      });
      logEvent("error", "job.failed", { jobId: job.id, kind: job.kind, code });
      results.push({
        id: job.id,
        status: manualReview ? "manual_review" : "retry",
      });
    }
  }
  return results;
}

async function processJob(job: Job) {
  const bookingId = stringPayload(job.payload, "bookingId");
  switch (job.kind) {
    case "booking.expire":
      return expireBooking(bookingId);
    case "booking.complete":
      return completeBooking(bookingId);
    case "cleaning.request":
      return createCleaningRequest(job, bookingId);
    case "notification.send":
      return sendNotification(job, bookingId);
    case "refund.request":
      return refundPayment(job, bookingId);
    case "access.provision":
      return provisionAccess(job, bookingId);
    case "access.reconcile":
      return reconcileAccess(job, bookingId);
    case "access.revoke":
      return revokeAccess(job.company_id, bookingId);
    default:
      throw new Error("unsupported_job_kind");
  }
}

async function expireBooking(bookingId: string) {
  const { error } = await createSupabaseAdminClient()
    .from("bookings")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("status", "awaiting_payment")
    .lte("hold_expires_at", new Date().toISOString());
  if (error) throw new Error("booking_expire_failed");
}

async function completeBooking(bookingId: string) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "completed", completed_at: now, updated_at: now })
    .eq("id", bookingId)
    .in("status", ["confirmed", "in_progress"])
    .lte("end_at", now)
    .select("company_id,room_id,end_at")
    .maybeSingle();
  if (error) throw new Error("booking_complete_failed");
  if (data)
    await supabase.from("durable_jobs").upsert(
      {
        company_id: data.company_id,
        kind: "cleaning.request",
        payload: { bookingId },
        dedupe_key: `cleaning.request:${bookingId}`,
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    );
}

async function createCleaningRequest(job: Job, bookingId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("room_id,end_at,status,companies(cleaning_contact_phone)")
    .eq("company_id", job.company_id)
    .eq("id", bookingId)
    .single();
  if (error || !booking) throw new Error("booking_not_found");
  // O aviso pode ser agendado para antes do fim da reunião, então a reserva
  // ainda pode ser cancelada no meio do caminho. Chamar a limpeza para uma sala
  // que ninguém usou é pior do que não chamar.
  if (!["confirmed", "in_progress", "completed"].includes(String(booking.status)))
    return;
  const { error: insertError } = await supabase
    .from("cleaning_requests")
    .upsert(
      {
        company_id: job.company_id,
        booking_id: bookingId,
        room_id: booking.room_id,
        scheduled_at: booking.end_at,
      },
      { onConflict: "company_id,booking_id", ignoreDuplicates: true },
    );
  if (insertError) throw new Error("cleaning_request_failed");
  const company = booking.companies as { cleaning_contact_phone?: string } | null;
  await notifyCleaningAutomation({
    contactPhone: company?.cleaning_contact_phone ?? null,
    bookingId,
    companyId: job.company_id,
    roomId: booking.room_id,
    scheduledAt: booking.end_at,
    idempotencyKey: job.dedupe_key,
  });
}

async function sendNotification(job: Job, bookingId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id,start_at,end_at,total_cents,customers(email,name),rooms(name,locations(name,address))")
    .eq("id", bookingId)
    .single();
  if (error || !data) throw new Error("booking_not_found");
  const profile = Array.isArray(data.customers)
    ? data.customers[0]
    : data.customers;
  const room = Array.isArray(data.rooms) ? data.rooms[0] : data.rooms;
  if (!profile?.email) throw new Error("notification_destination_not_found");
  const { data: existing } = await supabase
    .from("notifications")
    .select("id,status")
    .eq("booking_id", bookingId)
    .eq("type", String(job.payload.template ?? "booking-confirmed"))
    .eq("channel", "email")
    .maybeSingle();
  if (existing?.status === "sent") return;
  const location = (room as { locations?: { name?: string; address?: string } | null } | null)
    ?.locations;
  const email = renderBookingConfirmed({
    customerName: profile.name ?? "",
    roomName: room?.name ?? "Sala",
    unitName: location?.name ?? null,
    address: location?.address ?? null,
    startAt: data.start_at,
    endAt: data.end_at,
    totalCents: Number(data.total_cents ?? 0),
    // Sem endereço público, um botão levaria a um link morto na caixa de quem
    // recebeu — pior do que não ter botão.
    bookingUrl: appBaseUrlIsPublic()
      ? `${appBaseUrl()}/minhas-reservas/${data.id}`
      : null,
    accessNote:
      "O código de acesso da sala aparece na sua reserva pouco antes do horário.",
  });
  const subject = email.subject;
  const { delivered } = await sendBookingEmail({
    email: profile.email,
    subject,
    content: email.text,
    html: email.html,
    idempotencyKey: job.dedupe_key,
  });
  // `pending` quando o provedor é o simulador: a notificação existe e não foi
  // entregue. Gravar `sent` com data de envio faria o painel afirmar uma
  // entrega que ninguém fez.
  const status = delivered ? "sent" : "pending";
  const sentAt = delivered ? new Date().toISOString() : null;
  if (existing) {
    await supabase
      .from("notifications")
      .update({ status, sent_at: sentAt })
      .eq("id", existing.id);
  } else {
    await supabase.from("notifications").insert({
      company_id: job.company_id,
      booking_id: bookingId,
      type: String(job.payload.template ?? "booking-confirmed"),
      channel: "email",
      destination: profile.email,
      subject,
      content: delivered
        ? "Confirmação de reserva enviada por e-mail."
        : "Confirmação de reserva pendente: provedor de e-mail em simulador.",
      status,
      sent_at: sentAt,
    });
  }
}

async function refundPayment(job: Job, bookingId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id,provider_payment_id,amount_cents")
    .eq("company_id", job.company_id)
    .eq("booking_id", bookingId)
    .eq("status", "approved")
    .single();
  if (error || !data?.provider_payment_id) throw new Error("payment_not_found");
  await paymentProvider().refund(
    data.provider_payment_id,
    data.amount_cents,
    job.dedupe_key,
  );
  const { error: updateError } = await supabase
    .from("payments")
    .update({ status: "refunded", refunded_at: new Date().toISOString() })
    .eq("id", data.id);
  if (updateError) throw new Error("refund_persist_failed");
  await supabase
    .from("bookings")
    .update({ status: "refunded" })
    .eq("id", bookingId);
}

async function provisionAccess(job: Job, bookingId: string) {
  const supabase = createSupabaseAdminClient();
  const context = await loadAccessContext(supabase, bookingId);
  const existing = await currentAccessCode(
    supabase,
    context.companyId,
    bookingId,
  );
  if (existing?.status === "active") return;
  const result = await accessProvider().createCode({
    bookingId,
    operationKey: job.dedupe_key,
    validFrom: context.validFrom,
    validUntil: context.validUntil,
  });
  if (result.kind === "timeout_unknown") {
    const { error } = await supabase.from("durable_jobs").upsert(
      {
        company_id: context.companyId,
        kind: "access.reconcile",
        payload: { bookingId, operationKey: result.operationKey },
        dedupe_key: `access.reconcile:${bookingId}`,
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    );
    if (error) throw new Error("access_reconcile_enqueue_failed");
    return;
  }
  if (result.kind !== "created") throw new Error(`access_${result.kind}`);
  await persistAccessCode(
    supabase,
    context,
    bookingId,
    result.externalCodeId,
    result.maskedCode,
  );
}

async function reconcileAccess(job: Job, bookingId: string) {
  const supabase = createSupabaseAdminClient();
  const context = await loadAccessContext(supabase, bookingId);
  const existing = await currentAccessCode(
    supabase,
    context.companyId,
    bookingId,
  );
  if (existing?.status === "active") return;
  const result = await accessProvider().findCode(
    stringPayload(job.payload, "operationKey"),
  );
  if (result.kind === "found") {
    await persistAccessCode(
      supabase,
      context,
      bookingId,
      result.externalCodeId,
      null,
    );
    return;
  }
  if (result.kind === "not_found") throw new Error("access_reconcile_retry");
  throw new Error("access_reconcile_ambiguous");
}

async function revokeAccess(companyId: string, bookingId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("booking_access_codes")
    .select("id,external_code_id,status")
    .eq("company_id", companyId)
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (error) throw new Error("access_lookup_failed");
  if (!data || data.status !== "active") return;
  if (!data.external_code_id) throw new Error("access_external_code_missing");
  await accessProvider().revokeCode(data.external_code_id);
  await supabase
    .from("booking_access_codes")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", data.id);
}

async function loadAccessContext(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  bookingId: string,
): Promise<AccessContext> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "company_id,start_at,end_at,rooms(access_before_minutes,access_after_minutes,locks(id))",
    )
    .eq("id", bookingId)
    .single();
  if (error || !data) throw new Error("booking_not_found");
  const room = Array.isArray(data.rooms) ? data.rooms[0] : data.rooms;
  const lock = Array.isArray(room?.locks) ? room.locks[0] : room?.locks;
  if (!room || !lock) throw new Error("lock_not_found");
  return {
    companyId: data.company_id,
    lockId: lock.id,
    validFrom: new Date(
      new Date(data.start_at).getTime() - room.access_before_minutes * 60_000,
    ),
    validUntil: new Date(
      new Date(data.end_at).getTime() + room.access_after_minutes * 60_000,
    ),
  };
}

async function currentAccessCode(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  companyId: string,
  bookingId: string,
) {
  const { data, error } = await supabase
    .from("booking_access_codes")
    .select("status")
    .eq("company_id", companyId)
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (error) throw new Error("access_lookup_failed");
  return data;
}

async function persistAccessCode(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  context: AccessContext,
  bookingId: string,
  externalCodeId: string,
  maskedCode: string | null,
) {
  const { error } = await supabase.from("booking_access_codes").upsert(
    {
      company_id: context.companyId,
      booking_id: bookingId,
      lock_id: context.lockId,
      external_code_id: externalCodeId,
      access_code_fingerprint: maskedCode,
      valid_from: context.validFrom.toISOString(),
      valid_until: context.validUntil.toISOString(),
      status: "active",
    },
    { onConflict: "company_id,booking_id" },
  );
  if (error) throw new Error("access_persist_failed");
}

function stringPayload(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  if (typeof value !== "string" || value.length > 100)
    throw new Error("invalid_job_payload");
  return value;
}

function errorCode(cause: unknown) {
  return cause instanceof Error
    ? cause.message.slice(0, 120)
    : "unknown_job_error";
}
