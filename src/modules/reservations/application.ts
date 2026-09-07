import type { PaymentProvider } from "@/integrations/contracts";

export type BookingCommand = Readonly<{
  /** Cliente da plataforma. A empresa não entra aqui: ela é da sala. */
  customerId: string;
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
  /** Instante em que o hold vence. É o relógio real do contador do checkout. */
  holdExpiresAt: string;
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

/** Pagamento falhou com o hold já criado — o horário continua reservado. */
export class PaymentFailedAfterHold extends Error {
  constructor(
    readonly holdExpiresAt: string,
    cause: unknown,
  ) {
    super("payment_failed_after_hold", { cause });
    this.name = "PaymentFailedAfterHold";
  }
}

export async function createBooking(
  repository: BookingRepository,
  paymentProvider: PaymentProvider,
  command: BookingCommand,
) {
  const hold = await repository.createHold(command);
  if (hold.duplicate && hold.booking.paymentId) {
    // Já existe cobrança para este hold. Sem consultar o provedor não se sabe se
    // ela foi aprovada, então o status seguro é "pendente": a tela nunca deve
    // cravar "confirmada" só porque a tentativa é repetida.
    return {
      ...hold,
      status: "pending" as const,
      checkout: `existing:${hold.booking.paymentId}`,
    };
  }

  let charge;
  try {
    charge = await paymentProvider.createCharge({
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
  } catch (cause) {
    // A sala já está bloqueada por este hold. Quem vai tentar de novo precisa
    // saber por quanto tempo o horário ainda é dele.
    throw new PaymentFailedAfterHold(hold.booking.holdExpiresAt, cause);
  }
  return {
    booking: { ...hold.booking, paymentId: charge.externalId },
    duplicate: hold.duplicate,
    // O status real da cobrança sobe até a tela: PIX nasce "pending" e só o
    // webhook confirma; cartão pode voltar "approved" ou "rejected" na hora.
    status: charge.status,
    checkout: charge.checkoutReference,
  };
}
