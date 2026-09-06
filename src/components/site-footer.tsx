import Link from "next/link";
import { Mail, ShieldCheck } from "lucide-react";
import { site, socials } from "@/lib/site";
import { Brand } from "./brand";

const NAVEGACAO = [
  { href: "/", label: "Salas disponíveis" },
  { href: "/minhas-reservas", label: "Minhas reservas" },
  { href: "/como-funciona", label: "Como funciona" },
];

const LEGAL = [
  { href: "/privacidade", label: "Aviso de Privacidade" },
  { href: "/cookies", label: "Cookies" },
];

export function SiteFooter() {
  return (
    // `mt-auto` prende o rodapé ao fim da janela nas páginas curtas. O `body` é
    // uma coluna flex, então isso resolve sem mexer no `main` de cada página.
    <footer className="mt-auto border-t border-border-subtle bg-surface-raised">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 lg:px-10">
        <div className="grid gap-9 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Brand />
            <p className="mt-3 max-w-xs text-subheadline leading-6 text-text-secondary">
              Salas de reunião reservadas em minutos, com acesso liberado no
              horário contratado.
            </p>
            {socials.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {socials.map((perfil) => (
                  <li key={perfil.name}>
                    <a
                      href={perfil.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center rounded-md border border-border-subtle px-3 text-caption font-semibold text-text-secondary hover:bg-surface-page"
                    >
                      {perfil.name}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Coluna titulo="Navegar">
            {NAVEGACAO.map((item) => (
              <ItemLink key={item.href} {...item} />
            ))}
          </Coluna>

          <Coluna titulo="Legal">
            {LEGAL.map((item) => (
              <ItemLink key={item.href} {...item} />
            ))}
          </Coluna>

          <Coluna titulo="Contato e suporte">
            <li>
              <a
                href={`mailto:${site.contactEmail}`}
                className="inline-flex items-center gap-2 text-subheadline text-text-secondary hover:text-text-link hover:underline"
              >
                <Mail size={16} aria-hidden="true" />
                {site.contactEmail}
              </a>
            </li>
            <li className="flex items-start gap-2 text-subheadline leading-6 text-text-secondary">
              <ShieldCheck
                size={16}
                aria-hidden="true"
                className="mt-1 shrink-0"
              />
              {/* Dizer quem processa o cartão reduz a hesitação de quem está
                  prestes a pagar, e é verdade verificável: o formulário envia
                  os dados direto ao Mercado Pago. */}
              Pagamento processado pelo Mercado Pago. Os dados do seu cartão não
              passam pelos nossos servidores.
            </li>
          </Coluna>
        </div>

        <div className="mt-9 flex flex-col gap-2 border-t border-border-subtle pt-6 text-caption text-text-secondary sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.legalName}. CNPJ{" "}
            {site.document}.
          </p>
          <p>Feito em Joinville, Santa Catarina.</p>
        </div>
      </div>
    </footer>
  );
}

function Coluna({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <nav aria-label={titulo}>
      <h2 className="text-caption font-bold uppercase tracking-wide text-text-secondary">
        {titulo}
      </h2>
      <ul className="mt-3 space-y-2.5">{children}</ul>
    </nav>
  );
}

function ItemLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="text-subheadline text-text-secondary hover:text-text-link hover:underline"
      >
        {label}
      </Link>
    </li>
  );
}
