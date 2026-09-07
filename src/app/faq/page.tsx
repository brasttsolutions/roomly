import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Perguntas frequentes",
  description:
    "Acesso à sala, cancelamento, extensão, atraso, reembolso e o que fazer se o código não funcionar.",
};

type Pergunta = { pergunta: string; resposta: React.ReactNode };

const PERGUNTAS: readonly Pergunta[] = [
  {
    pergunta: "Como recebo o acesso à sala?",
    resposta: (
      <>
        O acesso é um código digital temporário, liberado automaticamente cinco
        minutos antes do início da reserva. Ele aparece na ficha da reserva, em{" "}
        <Link href="/minhas-reservas">Minhas reservas</Link>, e vale até cinco
        minutos depois do fim do horário.
      </>
    ),
  },
  {
    pergunta: "Posso cancelar uma reserva?",
    resposta: (
      <>
        Pode. O cancelamento até 24 horas antes do início tem reembolso
        integral; a menos de 24 horas, não há reembolso. Os detalhes estão na{" "}
        <a href="/cancelamento">Política de Cancelamento e Reembolso</a>.
      </>
    ),
  },
  {
    pergunta: "Posso estender o horário?",
    resposta: (
      <>
        Sim, se a sala estiver livre no horário seguinte. A extensão fica
        disponível na própria reserva e é cobrada proporcionalmente ao tempo
        adicional.
      </>
    ),
  },
  {
    pergunta: "O que acontece se eu me atrasar?",
    resposta:
      "A reserva vale pelo intervalo contratado. O atraso não estende o horário nem gera reembolso do tempo não usado — o acesso continua válido até cinco minutos após o fim previsto.",
  },
  {
    pergunta: "Existe estacionamento?",
    resposta:
      "Depende da unidade. Quando há, a informação aparece na página da sala, junto dos demais recursos. Na dúvida, confira os detalhes da sala antes de reservar.",
  },
  {
    pergunta: "Posso emitir nota fiscal?",
    resposta: (
      <>
        A nota fiscal é emitida pelo coworking responsável pela sala. Se
        precisar, solicite pelo suporte em{" "}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> com os
        dados da reserva.
      </>
    ),
  },
  {
    pergunta: "Como funciona o reembolso?",
    resposta: (
      <>
        Quando há direito a reembolso, ele é feito pelo mesmo meio de pagamento,
        pelo Mercado Pago. No cartão pode aparecer na fatura seguinte; no PIX
        costuma ser mais rápido. As regras completas estão na{" "}
        <a href="/cancelamento">Política de Cancelamento e Reembolso</a>.
      </>
    ),
  },
  {
    pergunta: "O que faço se o código da porta não funcionar?",
    resposta: (
      <>
        Acione o suporte na hora, pelo{" "}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
        Confirmada a falha por nossa parte, você tem direito a reembolso
        integral ou a reagendamento sem custo.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <>
      <SiteHeader />
      <main
        id="conteudo"
        className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:py-10"
      >
        <Breadcrumbs
          className="mb-5"
          items={[
            { label: "Todas as salas", href: "/" },
            { label: "Perguntas frequentes" },
          ]}
        />
        <header className="border-b border-border-subtle pb-7">
          <p className="text-subheadline font-bold text-text-link">AJUDA</p>
          <h1 className="mt-1 text-title1 font-bold sm:text-headline">
            Perguntas frequentes
          </h1>
          <p className="mt-3 text-body leading-7 text-text-secondary">
            As dúvidas mais comuns sobre reservar e usar uma sala no Roomly.
          </p>
        </header>

        <ul className="mt-8 space-y-3">
          {PERGUNTAS.map(({ pergunta, resposta }) => (
            <li key={pergunta}>
              <details className="group rounded-lg border border-border-subtle bg-surface-raised">
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 text-subheadline font-bold [&::-webkit-details-marker]:hidden">
                  {pergunta}
                  <ChevronDown
                    size={18}
                    aria-hidden="true"
                    className="shrink-0 text-text-secondary transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="border-t border-border-subtle px-5 py-4 text-body leading-7 text-text-secondary [&_a]:font-semibold [&_a]:text-text-link [&_a]:underline">
                  {resposta}
                </div>
              </details>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-subheadline leading-7 text-text-secondary">
          Não encontrou o que procurava? Fale com a gente em{" "}
          <a
            href={`mailto:${site.contactEmail}`}
            className="font-semibold text-text-link underline"
          >
            {site.contactEmail}
          </a>
          .
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
