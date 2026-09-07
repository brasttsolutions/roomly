import { describe, expect, it, vi } from "vitest";
import type { PaymentProvider } from "@/integrations/contracts";
import {
  createBooking,
  PaymentFailedAfterHold,
  type BookingCommand,
  type BookingRepository,
} from "./application";

const command: BookingCommand = {
  customerId: "customer_1",
  roomId: "room_1",
  startAt: "2026-09-03T17:00:00.000Z",
  endAt: "2026-09-03T18:30:00.000Z",
  paymentMethod: "pix",
  payerEmail: "customer@example.com",
  idempotencyKey: "booking-command-0001",
};
const booking = {
  id: "booking_1",
  companyId: "company_1",
  userId: command.customerId,
  roomId: command.roomId,
  startAt: command.startAt,
  endAt: command.endAt,
  status: "awaiting_payment" as const,
  amountCents: 18000,
  holdExpiresAt: "2026-09-03T16:10:00.000Z",
};

function dependencies(duplicate = false, paymentId?: string) {
  const repository: BookingRepository = {
    createHold: vi
      .fn()
      .mockResolvedValue({ booking: { ...booking, paymentId }, duplicate }),
    recordPendingPayment: vi.fn().mockResolvedValue(undefined),
  };
  const paymentProvider: PaymentProvider = {
    createCharge: vi.fn().mockResolvedValue({
      externalId: "payment_1",
      status: "pending",
      checkoutReference: "pix_1",
    }),
    fetchPayment: vi.fn(),
    refund: vi.fn(),
  };
  return { repository, paymentProvider };
}

describe("booking application", () => {
  it("uses the server-calculated amount to create and record a charge", async () => {
    const { repository, paymentProvider } = dependencies();
    const result = await createBooking(repository, paymentProvider, command);
    expect(paymentProvider.createCharge).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 18000 }),
    );
    expect(repository.recordPendingPayment).toHaveBeenCalledWith(
      expect.objectContaining({ externalPaymentId: "payment_1" }),
    );
    expect(result.checkout).toBe("pix_1");
  });

  it("propaga o status real da cobrança para a tela decidir o que dizer", async () => {
    const { repository, paymentProvider } = dependencies();
    const result = await createBooking(repository, paymentProvider, command);
    // PIX nasce pendente: a tela não pode cravar "confirmada".
    expect(result.status).toBe("pending");
  });

  it("propaga aprovação imediata do cartão", async () => {
    const { repository, paymentProvider } = dependencies();
    vi.mocked(paymentProvider.createCharge).mockResolvedValue({
      externalId: "payment_2",
      status: "approved",
      checkoutReference: "confirmed:payment_2",
    });
    const result = await createBooking(repository, paymentProvider, command);
    expect(result.status).toBe("approved");
  });

  it("não confirma quando o cartão é recusado", async () => {
    const { repository, paymentProvider } = dependencies();
    vi.mocked(paymentProvider.createCharge).mockResolvedValue({
      externalId: "payment_3",
      status: "rejected",
      checkoutReference: "payment:payment_3",
    });
    const result = await createBooking(repository, paymentProvider, command);
    expect(result.status).toBe("rejected");
  });

  it("does not create another charge for a completed idempotent attempt", async () => {
    const { repository, paymentProvider } = dependencies(true, "payment_1");
    const result = await createBooking(repository, paymentProvider, command);
    expect(paymentProvider.createCharge).not.toHaveBeenCalled();
    expect(repository.recordPendingPayment).not.toHaveBeenCalled();
    expect(result.duplicate).toBe(true);
  });

  it("does not record a payment when provider creation fails", async () => {
    const { repository, paymentProvider } = dependencies();
    vi.mocked(paymentProvider.createCharge).mockRejectedValue(
      new Error("provider_offline"),
    );
    await expect(
      createBooking(repository, paymentProvider, command),
    ).rejects.toBeInstanceOf(PaymentFailedAfterHold);
    expect(repository.recordPendingPayment).not.toHaveBeenCalled();
  });

  it("reports the live hold when the payment fails", async () => {
    const { repository, paymentProvider } = dependencies();
    vi.mocked(paymentProvider.createCharge).mockRejectedValue(
      new Error("provider_offline"),
    );
    // O hold já bloqueou a sala: a falha precisa dizer até quando, e sem perder
    // a causa original para o log.
    let failure: PaymentFailedAfterHold | undefined;
    try {
      await createBooking(repository, paymentProvider, command);
    } catch (error) {
      failure = error as PaymentFailedAfterHold;
    }
    expect(failure?.holdExpiresAt).toBe(booking.holdExpiresAt);
    expect((failure?.cause as Error).message).toBe("provider_offline");
  });
});
