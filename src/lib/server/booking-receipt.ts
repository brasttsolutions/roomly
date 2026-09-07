import "server-only";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { bookingDetail, type BookingDetailView } from "./booking-detail";

export type ReceiptPayment = Readonly<{
  amountCents: number;
  method: string;
  status: string;
  providerPaymentId: string | null;
  paidAt: string | null;
}>;

export type ReceiptView = Readonly<{
  booking: BookingDetailView;
  payment: ReceiptPayment | null;
}>;

/**
 * Dados do comprovante: a reserva mais o pagamento a ela ligado. A leitura do
 * pagamento passa pela RLS `payments_owner_or_manager`, então só o dono da
 * reserva (ou quem gere o coworking) enxerga — ninguém emite o comprovante de
 * outra pessoa.
 */
export async function bookingReceipt(id: string): Promise<ReceiptView | null> {
  const booking = await bookingDetail(id);
  if (!booking) return null;

  if (integrationMode() === "simulator") {
    return {
      booking,
      payment: {
        amountCents: booking.totalCents,
        method: "pix",
        status: "approved",
        providerPaymentId: "sim_pay_demo",
        paidAt: booking.startAt,
      },
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("payments")
    .select("amount_cents,payment_method,status,provider_payment_id,paid_at")
    .eq("booking_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    booking,
    payment: data
      ? {
          amountCents: Number(data.amount_cents),
          method: String(data.payment_method),
          status: String(data.status),
          providerPaymentId: (data.provider_payment_id as string | null) ?? null,
          paidAt: (data.paid_at as string | null) ?? null,
        }
      : null,
  };
}
