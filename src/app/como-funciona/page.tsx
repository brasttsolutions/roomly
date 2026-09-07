import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  CreditCard,
  KeyRound,
  MousePointerClick,
  Sparkles,
  Timer,
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Como funciona",
  description:
    "Da escolha do horário à porta que abre: como uma reserva no Roomly acontece, e as decisões por trás disso.",
};

const PASSOS = [
  {
    icone: MousePointerClick,
    titulo: "Você escolhe a sala e o horário",
    texto:
      "A grade mostra o que está livre de verdade, no fuso da operação. Blocos ocupados aparecem riscados e dizem o motivo, em vez de simplesmente sumir.",
  },
  {
    icone: Timer,
    titulo: "O horário fica reservado por 10 minutos",
    texto:
      "Assim que o pagamento começa, aquele intervalo sai da grade para todo mundo. Ninguém compra a mesma sala enquanto você digita o cartão, e o contador na tela mostra quanto tempo resta.",
  },
  {
    icone: CreditCard,
    titulo: "O pagamento é processado pelo Mercado Pago",
    texto:
      "O formulário do cartão é deles e envia os dados direto para eles. Nenhum número de cartão passa pelos nossos servidores.",
  },
  {
    icone: CalendarCheck,
    titulo: "A confirmação chega por e-mail",
    texto:
      "Quando o Mercado Pago avisa que o pagamento foi aprovado, a reserva vira confirmada e a mensagem sai com sala, horário e endereço.",
  },
  {
    icone: KeyRound,
    titulo: "O acesso é liberado no horário",
    texto:
      "O código da porta vale de cinco minutos antes do início até cinco minutos depois do fim, e é revogado sozinho quando a reserva acaba ou é cancelada.",
  },
  {
    icone: Sparkles,
    titulo: "A limpeza é acionada automaticamente",
    texto:
      "Cada coworking escolhe quando chamar a equipe: minutos antes do fim, no encerramento ou depois. A sala volta para a grade preparada.",
  },
];

const DECISOES = [
  {
    titulo: "Um horário não é vendido duas vezes",
    texto:
      "A garantia contra sobreposição está no banco de dados, não na tela. Duas pessoas clicando no mesmo segundo continuam impossibilitadas de comprar o mesmo intervalo, porque a regra é uma restrição do próprio banco, e o preparo da sala entre uma reserva e outra conta como ocupado.",
  },
  {
    titulo: "Seus dados ficam separados e protegidos",
    texto:
      "Cada operação acessa somente as informações necessárias para administrar as próprias reservas. A separação é garantida dentro do banco de dados, linha a linha — não depende da tela filtrar certo, e uma consulta que escapasse da regra simplesmente não traria dado nenhum.",
  },
  {
    titulo: "Nada que importa depende do navegador ficar aberto",
    texto:
      "Liberar acesso, enviar e-mail, chamar a limpeza, encerrar a reserva e devolver dinheiro são tarefas registradas e reexecutáveis. Se uma falha, ela tenta de novo com espera crescente, e o que não adianta repetir vai para conferência humana em vez de girar para sempre.",
  },
  {
    titulo: "Falhar em silêncio é considerado defeito",
    texto:
      "Configuração ausente derruba a partida em vez de cair num modo de demonstração. Pagamento recusado registra o motivo do provedor. Consulta que falha derruba a tela em vez de exibir zero. Um número errado apresentado com confiança causa mais estrago que uma tela de erro.",
  },
];

export default function ComoFuncionaPage() {
  return (
    <>
      <SiteHeader />
      <main
        id="conteudo"
        className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:py-10"
      >
        <Breadcrumbs
          className="mb-5"
          items={[
            { label: "Todas as salas", href: "/" },
            { label: "Como funciona" },
          ]}
        />

        <header className="border-b border-border-subtle pb-8">
          <p className="text-subheadline font-bold text-text-link">
            COMO FUNCIONA
          </p>
          <h1 className="mt-1 max-w-2xl text-title1 font-bold sm:text-headline">
            Da escolha do horário até a porta que abre
          </h1>
          <p className="mt-4 max-w-2xl text-body leading-7 text-text-secondary">
            O Roomly existe para que reservar uma sala não dependa de ninguém
            atender o telefone. Você escolhe, paga e recebe o acesso. Do outro
            lado, o coworking recebe a reserva já preparada, com a limpeza
            agendada e o pagamento conciliado.
          </p>
        </header>

        <section className="mt-10" aria-labelledby="passos">
          <h2 id="passos" className="text-title2 font-bold">
            Uma reserva, passo a passo
          </h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2">
            {PASSOS.map((passo, indice) => (
              <li
                key={passo.titulo}
                className="rounded-lg border border-border-subtle bg-surface-raised p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-accent-subtle text-text-link">
                    <passo.icone size={20} aria-hidden="true" />
                  </span>
                  {/* O número diz a ordem, que aqui é informação real: cada
                      passo só acontece depois do anterior. */}
                  <span className="text-caption font-bold text-text-secondary">
                    PASSO {indice + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-callout font-bold">{passo.titulo}</h3>
                <p className="mt-2 text-subheadline leading-6 text-text-secondary">
                  {passo.texto}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12" aria-labelledby="decisoes">
          <h2 id="decisoes" className="text-title2 font-bold">
            As decisões por trás
          </h2>
          <p className="mt-3 max-w-2xl text-body leading-7 text-text-secondary">
            Reserva de sala parece simples até o dia em que duas pessoas clicam
            ao mesmo tempo, o pagamento cai fora do ar no meio da cobrança ou a
            porta precisa abrir sem ninguém por perto. Estas são as escolhas que
            sustentam esses dias.
          </p>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            {DECISOES.map((decisao) => (
              <div
                key={decisao.titulo}
                className="border-l-2 border-action-primary pl-5"
              >
                <dt className="text-callout font-bold">{decisao.titulo}</dt>
                <dd className="mt-2 text-subheadline leading-6 text-text-secondary">
                  {decisao.texto}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          className="mt-12 rounded-lg border border-border-subtle bg-surface-raised p-7"
          aria-labelledby="comecar"
        >
          <h2 id="comecar" className="text-title3 font-bold">
            Pronto para reservar
          </h2>
          <p className="mt-2 max-w-xl text-subheadline leading-6 text-text-secondary">
            As salas disponíveis, com preço e horários livres, estão na página
            inicial.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-action-primary px-5 text-subheadline font-bold text-text-on-accent hover:bg-action-primary-hover"
          >
            Ver salas disponíveis
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
