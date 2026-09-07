import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Brand } from "@/components/brand";
import { PrintButton } from "@/components/print-button";
import { bookingReceipt } from "@/lib/server/booking-receipt";
import { site } from "@/lib/site";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Comprovante" };
export const dynamic = "force-dynamic";

const METODO: Record<string, string> = {
  pix: "PIX",
  card: "Cartão de crédito",
  credit_card: "Cartão de crédito",
};

export default async function ComprovantePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const receipt = await bookingReceipt(id);
  if (!receipt) notFound();
  const { booking, payment } = receipt;
  const pago = payment?.status === "approved";

  const dia = new Intl.DateTimeFormat("pt-BR", {
    timeZone: booking.timeZone,
    dateStyle: "full",
  }).format(new Date(booking.startAt));
  const hora = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: booking.timeZone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  return (
    <main
      id="conteudo"
      className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:py-10"
    >
      <Link
        href={`/minhas-reservas/${booking.id}`}
        className="inline-flex items-center gap-1 text-subheadline font-semibold text-text-secondary hover:text-text-link print:hidden"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Voltar para a reserva
      </Link>

      <article className="mt-5 rounded-lg border border-border-subtle bg-surface-raised p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-subtle pb-5">
          <div>
            <Brand />
            <h1 className="mt-3 text-title2 font-bold">Comprovante de reserva</h1>
          </div>
          <span
            className={`rounded-md px-3 py-1 text-caption font-bold ${
              pago
                ? "bg-success-surface text-success-text"
                : "bg-warning-surface text-warning-text"
            }`}
          >
            {pago ? "Pago" : "Pagamento pendente"}
          </span>
        </div>

        <Secao titulo="Reserva">
          <Linha rotulo="Código" valor={booking.id} />
          <Linha rotulo="Sala" valor={booking.roomName} />
          <Linha
            rotulo="Local"
            valor={[booking.unit, booking.address].filter(Boolean).join(" · ")}
          />
          <Linha rotulo="Data" valor={dia} />
          <Linha
            rotulo="Horário"
            valor={`${hora(booking.startAt)} – ${hora(booking.endAt)}`}
          />
        </Secao>

        <Secao titulo="Pagamento">
          <Linha rotulo="Valor" valor={formatMoney(payment?.amountCents ?? booking.totalCents)} />
          <Linha
            rotulo="Forma"
            valor={payment ? (METODO[payment.method] ?? payment.method) : "—"}
          />
          <Linha
            rotulo="Situação"
            valor={pago ? "Aprovado" : "Aguardando confirmação"}
          />
          {payment?.providerPaymentId && (
            <Linha rotulo="Identificador" valor={payment.providerPaymentId} />
          )}
          {payment?.paidAt && (
            <Linha
              rotulo="Pago em"
              valor={new Intl.DateTimeFormat("pt-BR", {
                timeZone: booking.timeZone,
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(payment.paidAt))}
            />
          )}
        </Secao>

        <div className="mt-6 border-t border-border-subtle pt-5 text-caption leading-6 text-text-secondary">
          <p>
            Pagamento processado pelo Mercado Pago. Emitido por{" "}
            <span className="font-semibold text-text-primary">
              {site.legalName}
            </span>{" "}
            · CNPJ {site.document}.
          </p>
          {!pago && (
            <p className="mt-2">
              Este comprovante vale como registro da reserva. A quitação é
              confirmada quando o pagamento for aprovado.
            </p>
          )}
        </div>
      </article>

      <div className="mt-5 print:hidden">
        <PrintButton>Baixar / imprimir comprovante</PrintButton>
      </div>
    </main>
  );
}

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-caption font-bold uppercase tracking-wide text-text-secondary">
        {titulo}
      </h2>
      <dl className="mt-2 divide-y divide-border-subtle">{children}</dl>
    </section>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2 text-subheadline">
      <dt className="text-text-secondary">{rotulo}</dt>
      <dd className="text-right font-semibold text-text-primary">{valor}</dd>
    </div>
  );
}
