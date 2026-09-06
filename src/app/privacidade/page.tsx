import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";
import { Prosa, Secao, Tabela } from "./prosa";

export const metadata: Metadata = {
  title: "Aviso de Privacidade",
  description:
    "Como o Roomly trata dados pessoais, com quem compartilha e como exercer seus direitos previstos na LGPD.",
};

const dataRevisao = new Date(`${site.policyUpdatedAt}T12:00:00-03:00`);

export default function PrivacidadePage() {
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
            { label: "Aviso de Privacidade" },
          ]}
        />
        <header className="border-b border-border-subtle pb-7">
          <p className="text-subheadline font-bold text-text-link">
            PRIVACIDADE
          </p>
          <h1 className="mt-1 text-title1 font-bold sm:text-headline">
            Aviso de Privacidade
          </h1>
          <p className="mt-3 text-body leading-7 text-text-secondary">
            Este aviso explica quais dados pessoais o Roomly trata, por que
            trata cada um deles, com quem compartilha e como você exerce os
            direitos que a Lei Geral de Proteção de Dados garante.
          </p>
          <p className="mt-3 text-caption text-text-secondary">
            Última atualização em{" "}
            {dataRevisao.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              timeZone: "America/Sao_Paulo",
            })}
            .
          </p>
        </header>

        <Prosa>
          <Secao titulo="Quem trata seus dados">
            <p>
              O controlador dos dados pessoais tratados nesta plataforma é{" "}
              <strong>{site.legalName}</strong>, inscrita no CNPJ sob o número{" "}
              {site.document}.
            </p>
            <p>
              Para qualquer assunto relacionado a dados pessoais, incluindo os
              pedidos descritos na seção “Seus direitos”, o canal é{" "}
              <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
            </p>
            <p>
              O Roomly é uma plataforma usada por coworkings para receber
              reservas. Quando você reserva uma sala, o coworking responsável
              por aquele espaço recebe os dados necessários para preparar e
              liberar o local. Cada coworking responde pelo uso que faz desses
              dados dentro da própria operação.
            </p>
          </Secao>

          <Secao titulo="Quais dados tratamos e por quê">
            <p>
              Tratamos apenas o que a reserva exige para funcionar. Não pedimos
              dados sensíveis, não montamos perfil comportamental e não vendemos
              dado nenhum.
            </p>
            <Tabela
              cabecalho={["Dado", "Para que serve", "Base legal"]}
              linhas={[
                [
                  "Nome, e-mail e telefone",
                  "Identificar você na conta, enviar a confirmação da reserva e permitir contato sobre ela",
                  "Execução de contrato",
                ],
                [
                  "Senha",
                  "Proteger o acesso à sua conta. Fica guardada de forma cifrada e ninguém, nem nós, consegue lê-la",
                  "Execução de contrato",
                ],
                [
                  "Reservas: sala, unidade, data, horário e valor",
                  "Reservar o espaço, calcular o preço e liberar o acesso no horário contratado",
                  "Execução de contrato",
                ],
                [
                  "Registros de pagamento: valor, forma, situação e o identificador gerado pelo Mercado Pago",
                  "Confirmar a reserva, emitir cobrança e processar reembolso quando houver cancelamento",
                  "Execução de contrato e obrigação legal",
                ],
                [
                  "Registros de envio de e-mail: destinatário, assunto e conteúdo enviado",
                  "Comprovar que a confirmação foi entregue e investigar falhas de entrega",
                  "Legítimo interesse",
                ],
                [
                  "Registros técnicos: endereço IP, data e hora de acessos e erros da aplicação",
                  "Segurança, prevenção a abuso e correção de falhas",
                  "Legítimo interesse",
                ],
              ]}
            />
            <p>
              <strong>Dados de cartão não passam por nós.</strong> O formulário
              de pagamento é fornecido pelo Mercado Pago e envia os dados do
              cartão diretamente para eles. O que chega aos nossos servidores é
              apenas um identificador da transação. Não armazenamos número,
              validade nem código de segurança de nenhum cartão.
            </p>
          </Secao>

          <Secao titulo="Com quem compartilhamos">
            <p>
              Compartilhamos o mínimo necessário, e apenas com fornecedores que
              executam uma parte do serviço em nosso nome.
            </p>
            <Tabela
              cabecalho={["Fornecedor", "O que recebe", "Para quê"]}
              linhas={[
                [
                  "Supabase",
                  "Conta, reservas e registros de pagamento",
                  "Banco de dados e autenticação",
                ],
                [
                  "Mercado Pago",
                  "E-mail do pagador, valor e dados do cartão informados diretamente a eles",
                  "Processamento do pagamento",
                ],
                [
                  "Resend",
                  "Nome, e-mail e conteúdo da mensagem",
                  "Envio dos e-mails de confirmação",
                ],
                [
                  "Sentry",
                  "Registros técnicos de erro da aplicação",
                  "Monitoramento e correção de falhas",
                ],
                [
                  "Railway",
                  "Tráfego da aplicação",
                  "Hospedagem",
                ],
                [
                  "Coworking responsável pela sala",
                  "Nome, horário e sala reservada",
                  "Preparar o espaço e liberar o acesso",
                ],
              ]}
            />
            <p>
              Alguns desses fornecedores processam dados fora do Brasil. A
              transferência acontece com base nas cláusulas contratuais de cada
              serviço e se limita ao necessário para a execução do contrato.
            </p>
            <p>
              Fora dessa lista, só compartilhamos dados por ordem judicial ou
              exigência de autoridade competente.
            </p>
          </Secao>

          <Secao titulo="Por quanto tempo guardamos">
            <p>
              Sua conta e as reservas associadas permanecem enquanto a conta
              existir. Registros de pagamento são mantidos pelo prazo exigido
              pela legislação fiscal, mesmo depois do encerramento da conta,
              porque a lei nos obriga a isso. Registros técnicos de acesso são
              mantidos por seis meses, conforme o Marco Civil da Internet.
            </p>
            <p>
              Encerrada a finalidade e vencidos os prazos legais, os dados são
              eliminados.
            </p>
          </Secao>

          <Secao titulo="Seus direitos">
            <p>
              A LGPD garante a você, a qualquer momento e sem custo, o direito
              de:
            </p>
            <ul>
              <li>confirmar se tratamos dados seus e acessá-los;</li>
              <li>corrigir dados incompletos, inexatos ou desatualizados;</li>
              <li>
                pedir a anonimização, o bloqueio ou a eliminação de dados
                desnecessários ou tratados fora da lei;
              </li>
              <li>solicitar a portabilidade dos seus dados;</li>
              <li>
                pedir a eliminação dos dados tratados com base no seu
                consentimento;
              </li>
              <li>saber com quem compartilhamos seus dados;</li>
              <li>
                opor-se a um tratamento feito com base em legítimo interesse; e
              </li>
              <li>revogar consentimento, quando ele for a base do tratamento.</li>
            </ul>
            <p>
              Para exercer qualquer um deles, escreva para{" "}
              <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
              Respondemos em até quinze dias. Podemos pedir informações
              adicionais para confirmar sua identidade antes de atender ao
              pedido, justamente para não entregar seus dados a outra pessoa.
            </p>
            <p>
              Alguns pedidos têm limite legal. Não podemos eliminar registros de
              pagamento antes do prazo fiscal, por exemplo, mesmo a seu pedido.
              Quando isso acontecer, explicamos o motivo na resposta.
            </p>
          </Secao>

          <Secao titulo="Como protegemos">
            <p>
              O acesso aos dados é isolado por coworking diretamente no banco, e
              não apenas na aplicação: cada consulta só alcança as linhas do
              inquilino a que pertence. As senhas ficam cifradas, o tráfego
              trafega por conexão criptografada e o cookie que mantém sua sessão
              não é acessível por scripts da página.
            </p>
            <p>
              Nenhum sistema é imune. Se ocorrer um incidente de segurança que
              possa trazer risco relevante a você, comunicaremos você e a
              Autoridade Nacional de Proteção de Dados.
            </p>
          </Secao>

          <Secao titulo="Cookies">
            <p>
              Usamos apenas o cookie que mantém você conectado e uma preferência
              de tema guardada no seu navegador. Não há cookie de publicidade,
              rastreamento ou análise de audiência. A página de{" "}
              <a href="/cookies">Cookies</a> detalha cada um deles.
            </p>
          </Secao>

          <Secao titulo="Menores de idade">
            <p>
              O Roomly não se destina a menores de 18 anos e não coletamos
              intencionalmente dados de crianças ou adolescentes. Se identificar
              um cadastro nessa situação, escreva para{" "}
              <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> e
              faremos a exclusão.
            </p>
          </Secao>

          <Secao titulo="Mudanças neste aviso">
            <p>
              Quando este aviso mudar, atualizamos a data no topo da página. Se
              a mudança afetar de forma significativa como tratamos seus dados,
              avisamos por e-mail antes de ela passar a valer.
            </p>
          </Secao>
        </Prosa>
      </main>
      <SiteFooter />
    </>
  );
}
