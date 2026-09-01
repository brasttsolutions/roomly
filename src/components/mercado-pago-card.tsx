"use client";
import { useEffect } from "react";
import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";

export type CardPaymentData = Readonly<{
  cardToken: string;
  paymentMethodId: string;
  issuerId: string;
  installments: number;
}>;

export function MercadoPagoCard({
  publicKey,
  amountCents,
  submit,
}: {
  publicKey: string;
  amountCents: number;
  submit: (data: CardPaymentData) => Promise<boolean>;
}) {
  useEffect(() => {
    initMercadoPago(publicKey, { locale: "pt-BR" });
  }, [publicKey]);

  return (
    <div className="mt-4 min-h-80" data-testid="mercado-pago-card">
      <CardPayment
        initialization={{ amount: amountCents / 100 }}
        customization={{ paymentMethods: { maxInstallments: 1 } }}
        locale="pt-BR"
        onSubmit={async (form) => {
          const accepted = await submit({
            cardToken: form.token,
            paymentMethodId: form.payment_method_id,
            issuerId: form.issuer_id,
            installments: form.installments,
          });
          if (!accepted) throw new Error("booking_failed");
        }}
      />
    </div>
  );
}
