import type { PaymentProvider } from "@/integrations/contracts";

export type BookingCommand = Readonly<{
  companyId: string;
  profileId: string;
  roomId: string;
  startAt: string;
  endAt: string;
  paymentMethod: "pix" | "card";
  payerEmail: string;
  cardToken?: string;
  paymentMethodId?: string;
  issuerId?: string;
  installments?: number;
  idempotencyKey: string;
}>;

export type BookingRecord = Readonly<{
  id: string;
  companyId: string;
  userId: string;
  roomId: string;
  startAt: string;
  endAt: string;
  status: "awaiting_payment";
  amountCents: number;
  paymentId?: string;
}>;

export interface BookingRepository {
  createHold(command: BookingCommand): Promise<{
    booking: BookingRecord;
    duplicate: boolean;
  }>;
  recordPendingPayment(input: {
    booking: BookingRecord;
    externalPaymentId: string;
    paymentMethod: "pix" | "card";
    idempotencyKey: string;
  }): Promise<void>;
}

export async function createBooking(
  repository: BookingRepository,
  paymentProvider: PaymentProvider,
  command: BookingCommand,
) {
  const hold = await repository.createHold(command);
  if (hold.duplicate && hold.booking.paymentId) {
    return { ...hold, checkout: `existing:${hold.booking.paymentId}` };
  }

  const charge = await paymentProvider.createCharge({
    bookingId: hold.booking.id,
    amountCents: hold.booking.amountCents,
    method: command.paymentMethod,
    idempotencyKey: command.idempotencyKey,
    payerEmail: command.payerEmail,
    cardToken: command.cardToken,
    paymentMethodId: command.paymentMethodId,
    issuerId: command.issuerId,
    installments: command.installments,
  });
  await repository.recordPendingPayment({
    booking: hold.booking,
    externalPaymentId: charge.externalId,
    paymentMethod: command.paymentMethod,
    idempotencyKey: command.idempotencyKey,
  });
  return {
    booking: { ...hold.booking, paymentId: charge.externalId },
    duplicate: hold.duplicate,
    checkout: charge.checkoutReference,
  };
}
