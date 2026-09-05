import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

/**
 * Trilha completa no desktop; no telefone, só o pai imediato com "‹". A trilha
 * inteira em tela estreita quebra em duas linhas e empurra o título da página
 * para baixo da dobra.
 */
export function Breadcrumbs({
  items,
  className,
}: {
  /** Do mais geral ao mais específico. O último é a página atual. */
  items: readonly Crumb[];
  className?: string;
}) {
  const current = items.at(-1);
  const parent = items.at(-2);
  if (!current) return null;

  return (
    <nav aria-label="Trilha" className={className}>
      <ol className="flex items-center gap-1.5 text-subheadline">
        {parent && (
          <li className="sm:hidden">
            <Link
              href={parent.href ?? "/"}
              className="inline-flex items-center gap-1 font-bold text-text-secondary hover:text-text-primary"
            >
              <ChevronLeft size={17} aria-hidden="true" />
              {parent.label}
            </Link>
          </li>
        )}
        {items.map((item, index) => (
          <li
            key={item.label}
            className={cn(
              "hidden items-center gap-1.5 sm:flex",
              index === items.length - 1 && "min-w-0",
            )}
          >
            {index > 0 && (
              <span aria-hidden="true" className="text-text-secondary">
                /
              </span>
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="text-text-secondary hover:text-text-primary"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate font-semibold">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
