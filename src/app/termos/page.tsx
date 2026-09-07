import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Alert } from "@/components/ui/alert";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";
import { Prosa, Secao } from "../privacidade/prosa";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "As regras de uso do Roomly: reserva, pagamento, acesso à sala, utilização do espaço e responsabilidades.",
};

export default function TermosPage() {
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
            { label: "Termos de Uso" },
          ]}
        />
        <header className="border-b border-border-subtle pb-7">
          <p className="text-subheadline font-bold text-text-link">TERMOS DE USO</p>
          <h1 className="mt-1 text-title1 font-bold sm:text-headline">
            Termos de Uso do Roomly
          </h1>
          <p className="mt-3 text-body leading-7 text-text-secondary">
            Estes termos regem o uso da plataforma Roomly para reservar e
            utilizar salas. Ao concluir uma reserva, você concorda com eles.
          </p>
          <p className="mt-2 text-caption text-text-secondary">
            Última atualização: {formatarData(site.policyUpdatedAt)}.
          </p>
        </header>

        <Alert tone="info" className="mt-6" title="Rascunho para revisão">
          Este texto é uma versão inicial com regras padrão e ainda será
          revisado juridicamente antes da operação com clientes reais.
        </Alert>

        <Prosa>
          <Secao titulo="Quem opera a plataforma">
            <p>
              O Roomly é operado por <strong>{site.legalName}</strong>, inscrita
              no CNPJ {site.document}, com sede em Joinville, Santa Catarina. O
              Roomly conecta você (cliente) ao coworking dono da sala e cuida da
              reserva, do pagamento, da liberação do acesso e da comunicação.
            </p>
            <p>
              A sala é fornecida pelo coworking anunciante. O Roomly responde
              pela plataforma; o coworking, pelo espaço físico e pelo que nele
              acontece.
            </p>
          </Secao>

          <Secao titulo="Conta e cadastro">
            <ul>
              <li>
                Você precisa de uma conta para reservar. Os dados informados
                devem ser verdadeiros e mantidos atualizados.
              </li>
              <li>
                A senha é pessoal e intransferível. Você responde pelo que for
                feito na sua conta enquanto ela estiver conectada.
              </li>
              <li>
                É preciso ter 18 anos ou mais, ou usar sob responsabilidade de
                quem tem.
              </li>
            </ul>
          </Secao>

          <Secao titulo="Reserva e pagamento">
            <ul>
              <li>
                Ao escolher sala, dia e horário, o sistema bloqueia o intervalo
                por tempo limitado enquanto o pagamento é concluído. Sem
                pagamento aprovado dentro desse prazo, o bloqueio é liberado e o
                horário volta a ficar disponível.
              </li>
              <li>
                O preço mostrado antes da confirmação é o preço final da
                reserva, calculado pela duração escolhida.
              </li>
              <li>
                O pagamento é processado pelo <strong>Mercado Pago</strong>. Os
                dados do cartão não passam pelos servidores do Roomly.
              </li>
              <li>
                A reserva só é confirmada após a aprovação do pagamento. No PIX,
                a confirmação ocorre quando o pagamento é compensado.
              </li>
            </ul>
          </Secao>

          <Secao titulo="Acesso à sala">
            <ul>
              <li>
                O acesso é liberado por código digital temporário, válido de
                cinco minutos antes do início a cinco minutos depois do fim da
                reserva.
              </li>
              <li>
                O código é pessoal. Compartilhá-lo com terceiros é de sua
                responsabilidade.
              </li>
              <li>
                Se o acesso falhar no horário, veja a{" "}
                <a href="/cancelamento">Política de Cancelamento e Reembolso</a>,
                que trata de falha de acesso e indisponibilidade.
              </li>
            </ul>
          </Secao>

          <Secao titulo="Uso do espaço">
            <ul>
              <li>
                Use a sala apenas para o fim contratado e respeite a capacidade
                máxima informada.
              </li>
              <li>
                É proibido qualquer uso ilícito, perigoso ou que perturbe outros
                ocupantes do local.
              </li>
              <li>
                Ao final do horário, deixe a sala em condições de uso. A limpeza
                entre reservas é acionada automaticamente.
              </li>
            </ul>
          </Secao>

          <Secao titulo="Permanência além do horário e extensão">
            <ul>
              <li>
                A reserva vale apenas pelo intervalo contratado. Precisando de
                mais tempo, use a opção de <strong>estender a reserva</strong>,
                sujeita à disponibilidade da sala no horário seguinte.
              </li>
              <li>
                Permanecer na sala além do horário, sem extensão, pode gerar
                cobrança adicional proporcional e prejudicar a próxima reserva.
              </li>
            </ul>
          </Secao>

          <Secao titulo="Danos ao espaço">
            <p>
              Você é responsável por danos causados ao espaço, ao mobiliário ou
              aos equipamentos durante o seu horário, ressalvado o desgaste
              normal de uso. Custos de reparo podem ser cobrados pelo coworking.
            </p>
          </Secao>

          <Secao titulo="Cancelamento, reembolso e indisponibilidade">
            <p>
              As regras de cancelamento, reembolso, atraso, ausência, falha de
              acesso e indisponibilidade da sala estão detalhadas na{" "}
              <a href="/cancelamento">Política de Cancelamento e Reembolso</a>,
              que faz parte destes termos.
            </p>
          </Secao>

          <Secao titulo="Responsabilidades e limites">
            <ul>
              <li>
                O Roomly se empenha em manter a plataforma disponível, mas não
                garante funcionamento ininterrupto e não responde por caso
                fortuito ou força maior.
              </li>
              <li>
                O coworking responde pelas condições físicas do espaço, pela
                segurança do local e pelo cumprimento das normas aplicáveis.
              </li>
              <li>
                O Roomly não se responsabiliza por objetos deixados na sala nem
                por acordos feitos diretamente entre você e o coworking fora da
                plataforma.
              </li>
            </ul>
          </Secao>

          <Secao titulo="Dados pessoais">
            <p>
              O tratamento de dados pessoais segue o{" "}
              <a href="/privacidade">Aviso de Privacidade</a> e a{" "}
              <a href="/cookies">política de Cookies</a>.
            </p>
          </Secao>

          <Secao titulo="Alterações destes termos">
            <p>
              Estes termos podem ser atualizados. A versão vigente é sempre a
              publicada nesta página, com a data de última atualização no topo.
              Mudanças relevantes são comunicadas com antecedência razoável.
            </p>
          </Secao>

          <Secao titulo="Contato">
            <p>
              Dúvidas sobre estes termos:{" "}
              <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
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
