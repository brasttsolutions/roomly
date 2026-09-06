import { beforeEach, describe, expect, it, vi } from "vitest";
import { runDueJobs } from "./job-worker";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  accessProvider: vi.fn(),
  paymentProvider: vi.fn(),
  sendBookingEmail: vi.fn(),
  notifyCleaningAutomation: vi.fn(),
  logEvent: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));
vi.mock("@/lib/server/access-provider", () => ({
  accessProvider: mocks.accessProvider,
}));
vi.mock("@/lib/server/payment-provider", () => ({
  paymentProvider: mocks.paymentProvider,
}));
vi.mock("@/integrations/resend", () => ({
  sendBookingEmail: mocks.sendBookingEmail,
}));
vi.mock("@/integrations/n8n", () => ({
  notifyCleaningAutomation: mocks.notifyCleaningAutomation,
}));
vi.mock("@/lib/server/logger", () => ({ logEvent: mocks.logEvent }));

describe("job worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.paymentProvider.mockReturnValue({ refund: vi.fn() });
    mocks.sendBookingEmail.mockResolvedValue({ delivered: true });
    mocks.notifyCleaningAutomation.mockResolvedValue(undefined);
  });

  it("enqueues reconcile instead of retrying a timed-out access creation", async () => {
    const supabase = createSupabaseStub({
      jobs: [
        {
          id: "job_1",
          company_id: "company_1",
          kind: "access.provision",
          payload: { bookingId: "booking_1" },
          attempts: 0,
          dedupe_key: "access.provision:booking_1",
        },
      ],
      booking: bookingRow(),
      accessCode: null,
    });
    mocks.createSupabaseAdminClient.mockReturnValue(supabase);
    mocks.accessProvider.mockReturnValue({
      createCode: vi.fn().mockResolvedValue({
        kind: "timeout_unknown",
        operationKey: "access.provision:booking_1",
      }),
      findCode: vi.fn(),
      revokeCode: vi.fn(),
    });

    const result = await runDueJobs(10);

    expect(result).toEqual([{ id: "job_1", status: "completed" }]);
    expect(supabase.tables.durable_jobs.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "access.reconcile",
        dedupe_key: "access.reconcile:booking_1",
      }),
      expect.objectContaining({
        onConflict: "dedupe_key",
        ignoreDuplicates: true,
      }),
    );
    // `target_attempts` é a marca de posse do lease: sem ela, um worker
    // atrasado escreve o desfecho de um job que já é de outro.
    expect(supabase.rpcs.complete_durable_job).toHaveBeenCalledWith({
      target_job_id: "job_1",
      target_attempts: 0,
    });
    expect(supabase.rpcs.retry_durable_job).not.toHaveBeenCalled();
  });

  it("persists an access code found during reconcile", async () => {
    const supabase = createSupabaseStub({
      jobs: [
        {
          id: "job_2",
          company_id: "company_1",
          kind: "access.reconcile",
          payload: {
            bookingId: "booking_1",
            operationKey: "access.provision:booking_1",
          },
          attempts: 1,
          dedupe_key: "access.reconcile:booking_1",
        },
      ],
      booking: bookingRow(),
      accessCode: null,
    });
    mocks.createSupabaseAdminClient.mockReturnValue(supabase);
    mocks.accessProvider.mockReturnValue({
      createCode: vi.fn(),
      findCode: vi.fn().mockResolvedValue({
        kind: "found",
        externalCodeId: "code_123",
      }),
      revokeCode: vi.fn(),
    });

    const result = await runDueJobs(10);

    expect(result).toEqual([{ id: "job_2", status: "completed" }]);
    expect(supabase.tables.booking_access_codes.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        booking_id: "booking_1",
        external_code_id: "code_123",
        access_code_fingerprint: null,
        status: "active",
      }),
      expect.objectContaining({ onConflict: "company_id,booking_id" }),
    );
    expect(supabase.rpcs.retry_durable_job).not.toHaveBeenCalled();
  });

  it("treats missing active access as an idempotent revoke", async () => {
    const supabase = createSupabaseStub({
      jobs: [
        {
          id: "job_3",
          company_id: "company_1",
          kind: "access.revoke",
          payload: { bookingId: "booking_1" },
          attempts: 0,
          dedupe_key: "access.revoke:booking_1",
        },
      ],
      booking: bookingRow(),
      accessCode: {
        id: "access_1",
        status: "revoked",
        external_code_id: "code_1",
      },
    });
    mocks.createSupabaseAdminClient.mockReturnValue(supabase);
    const provider = {
      createCode: vi.fn(),
      findCode: vi.fn(),
      revokeCode: vi.fn(),
    };
    mocks.accessProvider.mockReturnValue(provider);

    const result = await runDueJobs(10);

    expect(result).toEqual([{ id: "job_3", status: "completed" }]);
    expect(provider.revokeCode).not.toHaveBeenCalled();
    expect(supabase.rpcs.retry_durable_job).not.toHaveBeenCalled();
  });

  it("forwards the durable job key as the refund idempotency key", async () => {
    const refund = vi.fn().mockResolvedValue({ refundId: "refund_1" });
    mocks.paymentProvider.mockReturnValue({ refund });
    const supabase = createRefundSupabaseStub();
    mocks.createSupabaseAdminClient.mockReturnValue(supabase);

    const result = await runDueJobs(10);

    expect(result).toEqual([{ id: "job_refund", status: "completed" }]);
    expect(refund).toHaveBeenCalledWith(
      "payment_external_1",
      12000,
      "refund.request:booking_1",
    );
  });
});

function createRefundSupabaseStub() {
  const update = vi.fn(() => ({
    eq: vi.fn().mockResolvedValue({ error: null }),
  }));
  const select = vi.fn(() => {
    const chain = {
      eq: vi.fn(() => chain),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "payment_1",
          provider_payment_id: "payment_external_1",
          amount_cents: 12000,
        },
        error: null,
      }),
    };
    return chain;
  });
  return {
    rpc: vi.fn((name: string) => {
      if (name === "claim_durable_jobs")
        return Promise.resolve({
          data: [
            {
              id: "job_refund",
              company_id: "company_1",
              kind: "refund.request",
              payload: { bookingId: "booking_1" },
              attempts: 1,
              dedupe_key: "refund.request:booking_1",
            },
          ],
          error: null,
        });
      return Promise.resolve({ error: null });
    }),
    from: vi.fn((table: string) => {
      if (table === "payments") return { select, update };
      if (table === "bookings") return { update };
      throw new Error(`unexpected table ${table}`);
    }),
  };
}

function notificationBookingRow() {
  return {
    company_id: "company_1",
    start_at: "2030-01-10T14:00:00.000Z",
    end_at: "2030-01-10T15:00:00.000Z",
    customers: { email: "cliente@example.test", name: "Marina" },
    rooms: { name: "Sala Executiva" },
  };
}

function notificationJob() {
  return {
    id: "job_email",
    company_id: "company_1",
    kind: "notification.send",
    payload: { bookingId: "booking_1" },
    attempts: 0,
    dedupe_key: "notification.send:booking_1",
  };
}

function bookingRow() {
  return {
    company_id: "company_1",
    start_at: "2030-01-10T14:00:00.000Z",
    end_at: "2030-01-10T15:00:00.000Z",
    rooms: {
      access_before_minutes: 5,
      access_after_minutes: 5,
      locks: { id: "lock_1" },
    },
  };
}


describe("notificação por e-mail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notifyCleaningAutomation.mockResolvedValue(undefined);
  });

  // Falta de credencial não melhora esperando. Antes disto o job repetia oito
  // vezes com espera crescente — mais de uma hora — antes de aparecer para
  // alguém em "Precisa de atenção".
  it("manda configuração ausente direto para revisão, sem repetir", async () => {
    const supabase = createSupabaseStub({
      jobs: [notificationJob()],
      booking: notificationBookingRow(),
      accessCode: null,
    });
    mocks.createSupabaseAdminClient.mockReturnValue(supabase);
    mocks.sendBookingEmail.mockRejectedValue(
      new Error("resend_not_configured"),
    );

    const result = await runDueJobs();

    expect(result).toEqual([{ id: "job_email", status: "manual_review" }]);
    expect(supabase.rpcs.retry_durable_job).toHaveBeenCalledWith({
      target_job_id: "job_email",
      target_error_code: "resend_not_configured",
      target_manual_review: true,
      target_attempts: 0,
    });
  });

  it("manda recusa do provedor para revisão com o detalhe preservado", async () => {
    const supabase = createSupabaseStub({
      jobs: [notificationJob()],
      booking: notificationBookingRow(),
      accessCode: null,
    });
    mocks.createSupabaseAdminClient.mockReturnValue(supabase);
    mocks.sendBookingEmail.mockRejectedValue(
      new Error("resend_rejected:validation_error"),
    );

    const result = await runDueJobs();

    expect(result).toEqual([{ id: "job_email", status: "manual_review" }]);
    expect(supabase.rpcs.retry_durable_job).toHaveBeenCalledWith({
      target_job_id: "job_email",
      // O detalhe do provedor sobrevive até a tela de logs.
      target_error_code: "resend_rejected:validation_error",
      target_manual_review: true,
      target_attempts: 0,
    });
  });

  it("continua repetindo o que é passageiro", async () => {
    const supabase = createSupabaseStub({
      jobs: [notificationJob()],
      booking: notificationBookingRow(),
      accessCode: null,
    });
    mocks.createSupabaseAdminClient.mockReturnValue(supabase);
    mocks.sendBookingEmail.mockRejectedValue(
      new Error("resend_provider_error:rate_limit_exceeded"),
    );

    const result = await runDueJobs();

    expect(result).toEqual([{ id: "job_email", status: "retry" }]);
  });

  it("grava a notificação como pendente quando o provedor é o simulador", async () => {
    const supabase = createSupabaseStub({
      jobs: [notificationJob()],
      booking: notificationBookingRow(),
      accessCode: null,
    });
    mocks.createSupabaseAdminClient.mockReturnValue(supabase);
    mocks.sendBookingEmail.mockResolvedValue({ delivered: false });

    const result = await runDueJobs();

    expect(result).toEqual([{ id: "job_email", status: "completed" }]);
    expect(supabase.tables.notifications.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: "cliente@example.test",
        status: "pending",
        sent_at: null,
      }),
    );
  });

  it("registra o envio quando o provedor entregou", async () => {
    const supabase = createSupabaseStub({
      jobs: [notificationJob()],
      booking: notificationBookingRow(),
      accessCode: null,
    });
    mocks.createSupabaseAdminClient.mockReturnValue(supabase);
    mocks.sendBookingEmail.mockResolvedValue({ delivered: true });

    await runDueJobs();

    const [row] = supabase.tables.notifications.insert.mock.calls[0];
    expect(row.status).toBe("sent");
    expect(row.sent_at).toEqual(expect.any(String));
  });
});

function createSupabaseStub(input: {
  jobs: Array<Record<string, unknown>>;
  booking: Record<string, unknown> | null;
  accessCode: {
    id: string;
    status: string;
    external_code_id: string | null;
  } | null;
  notification?: Record<string, unknown> | null;
}) {
  const rpcs = {
    claim_durable_jobs: vi
      .fn()
      .mockResolvedValue({ data: input.jobs, error: null }),
    complete_durable_job: vi.fn().mockResolvedValue({ error: null }),
    retry_durable_job: vi.fn().mockResolvedValue({ error: null }),
  };

  const tables = {
    bookings: {
      select: vi.fn(() => selectChain(input.booking, true)),
      update: vi.fn(() => updateChain()),
    },
    booking_access_codes: {
      select: vi.fn(() => selectChain(input.accessCode, false)),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => updateChain()),
    },
    durable_jobs: {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    },
    notifications: {
      select: vi.fn(() => selectChain(input.notification ?? null, false)),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => updateChain()),
    },
  };

  return {
    rpcs,
    tables,
    rpc(name: string, payload?: Record<string, unknown>) {
      const handler = rpcs[name as keyof typeof rpcs];
      if (!handler) throw new Error(`unexpected rpc ${name}`);
      return handler(payload);
    },
    from(table: string) {
      const handler = tables[table as keyof typeof tables];
      if (!handler) throw new Error(`unexpected table ${table}`);
      return handler;
    },
  };
}

function selectChain(data: Record<string, unknown> | null, required: boolean) {
  return {
    eq() {
      return this;
    },
    single: vi
      .fn()
      .mockResolvedValue(
        data
          ? { data, error: null }
          : { data: null, error: required ? { code: "PGRST116" } : null },
      ),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
}

function updateChain() {
  return {
    eq: vi.fn().mockResolvedValue({ error: null, data: null }),
    in() {
      return this;
    },
    lte() {
      return this;
    },
    select: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };
}
