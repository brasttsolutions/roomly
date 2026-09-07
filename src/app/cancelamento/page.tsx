import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Alert } from "@/components/ui/alert";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";
import { Prosa, Secao, Tabela } from "../privacidade/prosa";

export const metadata: Metadata = {
  title: "Cancelamento e Reembolso",
  description:
    "Como funcionam cancelamento, reembolso, atraso, ausência, extensão, falha de acesso e indisponibilidade no Roomly.",
};

export default function CancelamentoPage() {
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
            { label: "Cancelamento e Reembolso" },
          ]}
        />
        <header className="border-b border-border-subtle pb-7">
          <p className="text-subheadline font-bold text-text-link">
            CANCELAMENTO E REEMBOLSO
          </p>
          <h1 className="mt-1 text-title1 font-bold sm:text-headline">
            Política de Cancelamento e Reembolso
          </h1>
          <p className="mt-3 text-body leading-7 text-text-secondary">
            O que acontece quando um plano muda: cancelamento, reembolso,
            atraso, ausência, extensão e os casos em que a falha é nossa.
          </p>
          <p className="mt-2 text-caption text-text-secondary">
            Última atualização: {formatarData(site.policyUpdatedAt)}.
          </p>
        </header>

        <Alert tone="info" className="mt-6" title="Rascunho para revisão">
          Prazos e percentuais abaixo são padrões iniciais e serão confirmados
          antes da operação com clientes reais.
        </Alert>

        <Prosa>
          <Secao titulo="Cancelamento e reembolso">
            <p>
              O prazo do cancelamento é medido em relação ao horário de início
              da reserva.
            </p>
            <Tabela
              cabecalho={["Quando você cancela", "Reembolso"]}
              linhas={[
                [
                  "Até 24 horas antes do início",
                  "Integral (100% do valor pago)",
                ],
                [
                  "Menos de 24 horas antes do início",
                  "Sem reembolso",
                ],
                [
                  "Após o início do horário ou ausência (no-show)",
                  "Sem reembolso",
                ],
              ]}
            />
            <p>
              O reembolso é feito pelo mesmo meio de pagamento, pelo Mercado
              Pago. O prazo de estorno depende do meio: no cartão, pode aparecer
              na fatura seguinte; no PIX, costuma ser mais rápido.
            </p>
          </Secao>

          <Secao titulo="Atraso">
            <p>
              A reserva vale pelo intervalo contratado. Chegar atrasado não
              estende o horário nem gera reembolso do tempo não utilizado: o
              acesso continua válido até cinco minutos após o fim previsto.
            </p>
          </Secao>

          <Secao titulo="Ausência (no-show)">
            <p>
              Não comparecer, sem cancelar dentro do prazo, é tratado como
              ausência e não gera reembolso. A sala fica reservada em seu nome
              durante todo o horário.
            </p>
          </Secao>

          <Secao titulo="Permanência além do horário">
            <p>
              Permanecer na sala depois do fim da reserva, sem ter estendido,
              pode gerar cobrança adicional proporcional ao tempo excedente e
              afeta a próxima reserva do espaço. Precisando de mais tempo,
              estenda antes do fim.
            </p>
          </Secao>

          <Secao titulo="Extensão de reserva">
            <ul>
              <li>
                A extensão depende de a sala estar livre no horário seguinte.
                Sem disponibilidade, não é possível estender.
              </li>
              <li>
                A extensão é uma nova cobrança, proporcional ao tempo adicional,
                e segue as mesmas regras de pagamento e confirmação.
              </li>
            </ul>
          </Secao>

          <Secao titulo="Indisponibilidade da sala">
            <p>
              Se, por responsabilidade do coworking ou da plataforma, a sala
              ficar indisponível para uma reserva já confirmada, você tem
              direito a <strong>reembolso integral</strong> ou a reagendamento
              sem custo, à sua escolha.
            </p>
          </Secao>

          <Secao titulo="Falha no acesso">
            <p>
              Se o código de acesso não funcionar no horário e isso impedir o
              uso da sala, acione o suporte imediatamente. Confirmada a falha por
              nossa parte, você tem direito a reembolso integral ou reagendamento
              sem custo. Guarde o horário e, se puder, um registro do problema.
            </p>
          </Secao>

          <Secao titulo="Como cancelar">
            <p>
              O cancelamento é feito em{" "}
              <Link href="/minhas-reservas">Minhas reservas</Link>, na própria
              reserva, enquanto estiver dentro do prazo. Em caso de dúvida,
              escreva para{" "}
              <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
            </p>
          </Secao>

          <Secao titulo="Relação com os Termos de Uso">
            <p>
              Esta política integra os{" "}
              <a href="/termos">Termos de Uso</a> do Roomly e deve ser lida em
              conjunto com eles.
            </p>
          </Secao>
        </Prosa>
      </main>
      <SiteFooter />
    </>
  );
}

function formatarData(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
