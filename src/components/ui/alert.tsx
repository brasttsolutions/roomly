import type { ReactNode } from "react";
import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertTone = "success" | "warning" | "danger" | "info";

const icones = {
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
  info: Info,
};

/**
 * Mensagem no fluxo, junto do que a causou. Erro usa `role="alert"` para
 * interromper o leitor de tela; os demais usam `role="status"`, que espera a
 * pausa. Erro de campo não vem aqui — pertence ao próprio campo.
 */
export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const Icone = icones[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-md border-l-[3px] p-4 text-subheadline",
        tone === "success" &&
          "border-success-border bg-success-surface text-success-text",
        tone === "warning" &&
          "border-warning-border bg-warning-surface text-warning-text",
        tone === "danger" &&
          "border-danger-border bg-danger-surface text-danger-text",
        tone === "info" && "border-info-border bg-info-surface text-info-text",
        className,
      )}
    >
      <Icone size={20} className="mt-px shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-1")}>{children}</div>}
      </div>
    </div>
  );
}
