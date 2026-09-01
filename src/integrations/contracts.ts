export type CreateChargeInput = Readonly<{
  bookingId: string;
  amountCents: number;
  method: "pix" | "card";
  idempotencyKey: string;
  payerEmail: string;
  cardToken?: string;
  paymentMethodId?: string;
  issuerId?: string;
  installments?: number;
}>;
export type ChargeResult = Readonly<{
  externalId: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | "refunded";
  checkoutReference: string;
  amountCents?: number;
}>;
export interface PaymentProvider {
  createCharge(input: CreateChargeInput): Promise<ChargeResult>;
  fetchPayment(externalId: string): Promise<ChargeResult>;
  refund(
    externalId: string,
    amountCents: number,
    idempotencyKey: string,
  ): Promise<{ refundId: string }>;
}

export type CreateCodeInput = Readonly<{
  bookingId: string;
  operationKey: string;
  validFrom: Date;
  validUntil: Date;
}>;
export type CreateCodeResult =
  | Readonly<{ kind: "created"; externalCodeId: string; maskedCode: string }>
  | Readonly<{ kind: "timeout_unknown"; operationKey: string }>
  | Readonly<{ kind: "offline"; retryAt: Date }>;
export type ReconcileCodeResult =
  | Readonly<{ kind: "found"; externalCodeId: string }>
  | Readonly<{ kind: "not_found" }>
  | Readonly<{ kind: "ambiguous" }>;
export interface AccessProvider {
  createCode(input: CreateCodeInput): Promise<CreateCodeResult>;
  findCode(operationKey: string): Promise<ReconcileCodeResult>;
  revokeCode(externalCodeId: string): Promise<void>;
}
