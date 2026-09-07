import type { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CalendarClock,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Para empresas",
  description:
    "Transforme suas salas em uma operação automatizada: reservas, pagamentos, controle de acesso e limpeza em uma única plataforma.",
};

const RECURSOS: ReadonlyArray<{
  icon: LucideIcon;
  titulo: string;
  texto: string;
}> = [
  {
    icon: CalendarCheck,
    titulo: "Reserva automática",
    texto:
      "O cliente escolhe sala e horário, o sistema bloqueia o intervalo e confirma sozinho quando o pagamento aprova. Sem planilha, sem confirmação manual.",
  },
  {
    icon: CreditCard,
    titulo: "Pagamento pelo Mercado Pago",
    texto:
      "Cartão e PIX processados pelo Mercado Pago. O dinheiro cai na sua conta e a reserva só confirma com pagamento aprovado.",
  },
  {
    icon: KeyRound,
    titulo: "Controle de acesso",
    texto:
      "Código digital temporário liberado no horário da reserva e revogado sozinho no fim. A porta abre para quem pagou, na janela certa.",
  },
  {
    icon: CalendarClock,
    titulo: "Gestão de disponibilidade",
    texto:
      "Expediente, duração mínima e máxima e preparo entre reservas viram regras do sistema. Um horário nunca é vendido duas vezes.",
  },
  {
    icon: Sparkles,
    titulo: "Limpeza integrada",
    texto:
      "A equipe de limpeza é acionada automaticamente ao fim de cada reserva, no momento que você definir. A sala volta pronta para a grade.",
  },
  {
    icon: LayoutDashboard,
    titulo: "Painel de operação",
    texto:
      "Reservas do dia, ocupação, fila de limpeza e pendências que precisam de atenção, tudo em uma tela feita para operar, não só para ler.",
  },
  {
    icon: BarChart3,
    titulo: "Relatórios",
    texto:
      "Ocupação por sala e por unidade e receita por período, para decidir preço e horário com número, não com achismo.",
  },
];

const CTA_EMAIL = `mailto:${site.contactEmail}?subject=${encodeURIComponent(
  "Quero usar o Roomly no meu coworking",
)}`;

export default function ParaEmpresasPage() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="w-full">
        <section className="border-b border-border-subtle bg-surface-raised">
          <div className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 lg:py-20">
            <p className="text-subheadline font-bold text-text-link">
              ROOMLY PARA COWORKINGS
            </p>
            <h1 className="mt-2 max-w-3xl text-headline font-bold leading-tight text-balance">
              Transforme suas salas em uma operação automatizada
            </h1>
            <p className="mt-4 max-w-2xl text-body leading-7 text-text-secondary">
              Reservas, pagamentos, controle de acesso e limpeza em uma única
              plataforma. Do clique do cliente à porta que abre, sem
              intervenção manual.
            </p>
            <a
              href={CTA_EMAIL}
              className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-action-primary px-6 text-callout font-bold text-text-on-accent hover:bg-action-primary-hover"
            >
              Quero usar o Roomly no meu coworking
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 lg:py-16">
          <h2 className="text-title1 font-bold">Tudo em um lugar só</h2>
          <p className="mt-2 max-w-2xl text-body leading-7 text-text-secondary">
            Cada peça da operação de um coworking, do agendamento à limpeza,
            resolvida pela mesma plataforma.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map(({ icon: Icone, titulo, texto }) => (
              <li
                key={titulo}
                className="rounded-lg border border-border-subtle bg-surface-raised p-6"
              >
                <span className="grid size-11 place-items-center rounded-md bg-surface-accent-subtle text-text-link">
                  <Icone size={22} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-title3 font-bold">{titulo}</h3>
                <p className="mt-2 text-subheadline leading-6 text-text-secondary">
                  {texto}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-border-subtle bg-surface-raised">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-start gap-5 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-title1 font-bold text-balance">
                Vamos colocar o seu coworking no automático?
              </h2>
              <p className="mt-2 max-w-xl text-body leading-7 text-text-secondary">
                Conte quantas salas e unidades você tem. A gente mostra como
                fica na prática.
              </p>
            </div>
            <a
              href={CTA_EMAIL}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-action-primary px-6 text-callout font-bold text-text-on-accent hover:bg-action-primary-hover"
            >
              Falar com o Roomly
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
