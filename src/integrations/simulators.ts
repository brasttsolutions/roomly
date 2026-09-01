import "server-only";
import { createHash } from "node:crypto";
import type {
  AccessProvider,
  ChargeResult,
  CreateChargeInput,
  CreateCodeInput,
  CreateCodeResult,
  PaymentProvider,
  ReconcileCodeResult,
} from "./contracts";

export class MercadoPagoSimulator implements PaymentProvider {
  private readonly charges = new Map<string, ChargeResult>();
  async createCharge(input: CreateChargeInput) {
    const existing = this.charges.get(input.idempotencyKey);
    if (existing) return existing;
    const result = {
      externalId: `sim_pay_${digest(input.idempotencyKey)}`,
      status: "pending" as const,
      checkoutReference:
        input.method === "pix"
          ? `000201ROOMLY${digest(input.bookingId)}`
          : `card:${input.bookingId}`,
      amountCents: input.amountCents,
    };
    this.charges.set(input.idempotencyKey, result);
    return result;
  }
  async fetchPayment(externalId: string) {
    return {
      externalId,
      status: "approved",
      checkoutReference: `confirmed:${externalId}`,
      amountCents: 12000,
    } as const;
  }
  async refund(
    externalId: string,
    amountCents: number,
    idempotencyKey: string,
  ) {
    void amountCents;
    void idempotencyKey;
    return { refundId: `sim_ref_${digest(externalId)}` };
  }
}
export class TTLockSimulator implements AccessProvider {
  private readonly codes = new Map<string, string>();
  constructor(
    private readonly mode:
      "online" | "offline" | "timeout_created" | "timeout_empty" = "online",
  ) {}
  async createCode(input: CreateCodeInput): Promise<CreateCodeResult> {
    if (this.mode === "offline")
      return { kind: "offline", retryAt: new Date(Date.now() + 30_000) };
    const id = `sim_code_${digest(input.operationKey)}`;
    if (this.mode === "timeout_created") {
      this.codes.set(input.operationKey, id);
      return { kind: "timeout_unknown", operationKey: input.operationKey };
    }
    if (this.mode === "timeout_empty")
      return { kind: "timeout_unknown", operationKey: input.operationKey };
    this.codes.set(input.operationKey, id);
    return { kind: "created", externalCodeId: id, maskedCode: "••• 921" };
  }
  async findCode(operationKey: string): Promise<ReconcileCodeResult> {
    const externalCodeId = this.codes.get(operationKey);
    return externalCodeId
      ? { kind: "found", externalCodeId }
      : { kind: "not_found" };
  }
  async revokeCode() {
    return;
  }
}
function digest(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}
