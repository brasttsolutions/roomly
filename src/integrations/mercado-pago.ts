import "server-only";
import { MercadoPagoConfig, Payment, PaymentRefund } from "mercadopago";
import type {
  ChargeResult,
  CreateChargeInput,
  PaymentProvider,
} from "./contracts";

export class MercadoPagoProvider implements PaymentProvider {
  private readonly payment: Payment;
  private readonly refundClient: PaymentRefund;

  constructor(accessToken: string) {
    const config = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 10_000 },
    });
    this.payment = new Payment(config);
    this.refundClient = new PaymentRefund(config);
  }

  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    if (input.method === "card" && !input.cardToken) {
      throw new Error("card_token_required");
    }
    const response = await this.payment.create({
      body: {
        transaction_amount: input.amountCents / 100,
        description: `Roomly ${input.bookingId}`,
        payment_method_id:
          input.method === "pix" ? "pix" : input.paymentMethodId,
        token: input.cardToken,
        installments:
          input.method === "card" ? (input.installments ?? 1) : undefined,
        issuer_id:
          input.issuerId && /^\d+$/.test(input.issuerId)
            ? Number(input.issuerId)
            : undefined,
        payer: { email: input.payerEmail },
        external_reference: input.bookingId,
      },
      requestOptions: { idempotencyKey: input.idempotencyKey },
    });
    if (!response.id) throw new Error("mercado_pago_missing_payment_id");
    return {
      externalId: String(response.id),
      status: mapStatus(response.status),
      checkoutReference:
        response.point_of_interaction?.transaction_data?.qr_code ??
        `payment:${response.id}`,
      amountCents: Math.round((response.transaction_amount ?? 0) * 100),
    };
  }

  async fetchPayment(externalId: string): Promise<ChargeResult> {
    const response = await this.payment.get({ id: externalId });
    return {
      externalId,
      status: mapStatus(response.status),
      checkoutReference: `payment:${externalId}`,
      amountCents: Math.round((response.transaction_amount ?? 0) * 100),
    };
  }

  async refund(
    externalId: string,
    amountCents: number,
    idempotencyKey: string,
  ) {
    const response = await this.refundClient.create({
      payment_id: externalId,
      body: { amount: amountCents / 100 },
      requestOptions: { idempotencyKey },
    });
    if (!response.id) throw new Error("mercado_pago_missing_refund_id");
    return { refundId: String(response.id) };
  }
}

function mapStatus(status?: string): ChargeResult["status"] {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "cancelled") return "cancelled";
  if (status === "refunded") return "refunded";
  return "pending";
}
