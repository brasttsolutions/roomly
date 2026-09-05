import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Passos do checkout. Cada passo anuncia "Passo 2 de 3: Pagamento" — o número
 * sozinho não diz a quem usa leitor de tela quanto falta.
 */
export function Stepper({
  steps,
  current,
  className,
}: {
  steps: readonly string[];
  /** Índice do passo atual, a partir de zero. */
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn("flex items-center gap-2", className)}>
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={step}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex items-center gap-2",
              index < steps.length - 1 && "flex-1",
            )}
          >
            <span className="sr-only">
              Passo {index + 1} de {steps.length}: {step}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full border-2 text-caption font-bold",
                done && "border-action-primary bg-action-primary text-text-on-accent",
                active && "border-action-primary text-text-primary",
                !done && !active && "border-border-control text-text-secondary",
              )}
            >
              {done ? <Check size={15} /> : index + 1}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                // Sem truncar: "Pagamen…" não é um passo. O traço entre os
                // passos absorve a sobra de largura no lugar do rótulo.
                "shrink-0 whitespace-nowrap text-caption",
                active
                  ? "font-semibold text-text-primary"
                  : "text-text-secondary",
              )}
            >
              {step}
            </span>
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "hidden h-px min-w-2 flex-1 sm:block",
                  done ? "bg-action-primary" : "bg-border-subtle",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
