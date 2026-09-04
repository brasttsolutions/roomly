"use client";
import { createContext, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

const DialogContext = createContext<(() => void) | null>(null);

/** Fecha o diálogo de dentro do conteúdo, sem passar callback por prop. */
export function useCloseDialog() {
  const close = useContext(DialogContext);
  return close ?? (() => {});
}

type Trigger = {
  label: string;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  /** Use quando o rótulo visível não descreve o alvo, como "Editar" em tabela. */
  ariaLabel?: string;
};

/**
 * Casca de diálogo sobre o `<dialog>` nativo, que já entrega prisão de foco,
 * `Escape` para fechar e devolução do foco ao gatilho — comportamentos que uma
 * implementação manual costuma errar.
 *
 * O conteúdo só é montado quando abre. Sem isso, uma tabela de N linhas com um
 * diálogo por linha carregaria N formulários completos, com rótulos repetidos
 * no DOM.
 */
export function Dialog({
  title,
  trigger,
  children,
  className,
}: {
  title: string;
  trigger: Trigger;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={trigger.variant ?? "primary"}
        size={trigger.size ?? "md"}
        aria-label={trigger.ariaLabel}
        onClick={() => {
          setOpen(true);
          ref.current?.showModal();
        }}
      >
        {trigger.icon}
        {trigger.label}
      </Button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        aria-label={title}
        className={cn(
          "m-auto w-[min(92vw,520px)] rounded-lg border border-border-subtle bg-surface-raised p-0 text-text-primary backdrop:bg-[rgb(14_22_48_/_0.55)]",
          className,
        )}
      >
        {open && (
          <div className="p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold">{title}</h2>
              <button
                type="button"
                title="Fechar"
                onClick={() => ref.current?.close()}
                className="grid size-9 shrink-0 place-items-center rounded-md hover:bg-surface-page"
              >
                <X size={18} />
              </button>
            </div>
            <DialogContext.Provider value={() => ref.current?.close()}>
              {children}
            </DialogContext.Provider>
          </div>
        )}
      </dialog>
    </>
  );
}
