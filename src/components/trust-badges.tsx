import {
  Headphones,
  KeyRound,
  RotateCcw,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Os cinco sinais de confiança, ao lado de onde a pessoa decide pagar.
 *
 * São as objeções silenciosas de quem está com o cartão na mão: é seguro? recebo
 * na hora? como entro? e se eu desistir? tem com quem falar? Cada selo responde
 * uma, e todos são verdade verificável no produto — não promessa de marketing.
 */
const SELOS: ReadonlyArray<{ icon: LucideIcon; texto: string }> = [
  { icon: ShieldCheck, texto: "Pagamento seguro pelo Mercado Pago" },
  { icon: Zap, texto: "Confirmação imediata" },
  { icon: KeyRound, texto: "Acesso digital temporário" },
  { icon: RotateCcw, texto: "Cancelamento gratuito até 24h antes" },
  { icon: Headphones, texto: "Suporte Roomly" },
];

export function TrustBadges({
  className = "",
  variant = "list",
}: {
  className?: string;
  /** `list` empilha (coluna lateral da sala); `inline` distribui (rodapé de tela larga). */
  variant?: "list" | "inline";
}) {
  return (
    <ul
      className={`${
        variant === "inline"
          ? "flex flex-wrap gap-x-5 gap-y-2"
          : "grid gap-2.5"
      } ${className}`}
    >
      {SELOS.map(({ icon: Icone, texto }) => (
        <li
          key={texto}
          className="flex items-center gap-2 text-caption text-text-secondary"
        >
          <Icone
            size={16}
            aria-hidden="true"
            className="shrink-0 text-text-link"
          />
          {texto}
        </li>
      ))}
    </ul>
  );
}
