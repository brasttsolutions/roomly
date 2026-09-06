import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";
import { Prosa, Secao, Tabela } from "../privacidade/prosa";

export const metadata: Metadata = {
  title: "Cookies",
  description:
    "O Roomly usa apenas o cookie que mantém você conectado e uma preferência de tema. Sem rastreamento, sem publicidade.",
};

export default function CookiesPage() {
  return (
    <>
      <SiteHeader />
      <main
        id="conteudo"
        className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:py-10"
      >
        <Breadcrumbs
          className="mb-5"
          items={[{ label: "Todas as salas", href: "/" }, { label: "Cookies" }]}
        />
        <header className="border-b border-border-subtle pb-7">
          <p className="text-subheadline font-bold text-text-link">COOKIES</p>
          <h1 className="mt-1 text-title1 font-bold sm:text-headline">
            Cookies e armazenamento no navegador
          </h1>
          <p className="mt-3 text-body leading-7 text-text-secondary">
            O Roomly guarda duas coisas no seu navegador, e nenhuma delas serve
            para rastrear você. Esta página lista as duas, sem exceção.
          </p>
        </header>

        <Prosa>
          <Secao titulo="O que guardamos">
            <Tabela
              cabecalho={["Nome", "O que é", "Por quanto tempo"]}
              linhas={[
                [
                  "sb-…-auth-token",
                  "O cookie que mantém você conectado depois do login. Sem ele, cada página pediria sua senha de novo",
                  "Até você sair da conta ou a sessão expirar",
                ],
                [
                  "roomly:theme",
                  "Sua escolha entre tema claro e escuro. Fica no armazenamento local do navegador e nunca é enviada aos nossos servidores",
                  "Até você limpar os dados do navegador",
                ],
              ]}
            />
          </Secao>

          <Secao titulo="Por que não pedimos seu consentimento">
            <p>
              Os dois itens acima são estritamente necessários para o site
              funcionar como você espera. A LGPD dispensa consentimento nesse
              caso, e um aviso pedindo permissão para o cookie que faz o login
              funcionar não protegeria você de nada.
            </p>
            <p>
              Preferimos dizer com clareza o que existe a interromper sua visita
              com uma janela que quase ninguém lê.
            </p>
          </Secao>

          <Secao titulo="O que não usamos">
            <p>
              Não há Google Analytics, pixel de rede social, mapa de calor,
              cookie de publicidade nem qualquer serviço que acompanhe sua
              navegação dentro ou fora deste site. Não vendemos nem cedemos
              dados para publicidade.
            </p>
            <p>
              Se isso mudar um dia, esta página muda junto, e aí sim passará a
              existir um pedido de consentimento antes de qualquer coisa ser
              carregada.
            </p>
          </Secao>

          <Secao titulo="Como remover">
            <p>
              Sair da sua conta apaga o cookie de sessão. A preferência de tema
              some ao limpar os dados do site pelo próprio navegador. Você
              também pode bloquear cookies nas configurações do navegador, mas
              nesse caso o login deixa de funcionar.
            </p>
            <p>
              Para qualquer dúvida, escreva para{" "}
              <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
              O tratamento completo de dados pessoais está no{" "}
              <a href="/privacidade">Aviso de Privacidade</a>.
            </p>
          </Secao>
        </Prosa>
      </main>
      <SiteFooter />
    </>
  );
}
