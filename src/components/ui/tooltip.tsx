"use client";
import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Só complementa, nunca carrega informação essencial — o `title` nativo que
 * havia antes não abre por teclado e não é estilizável, então quem navega sem
 * mouse simplesmente não recebia o texto.
 *
 * Aparece após 400ms de hover, imediatamente no foco, e some na hora. No toque
 * não existe: nesse caso a informação precisa estar no corpo da tela.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function schedule() {
    timer.current = setTimeout(() => setOpen(true), 400);
  }
  function cancel() {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  }

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={schedule}
      onMouseLeave={cancel}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={cancel}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            "pointer-events-none absolute left-1/2 z-50 w-max max-w-56 -translate-x-1/2 rounded-md bg-surface-inverse px-2.5 py-1.5 text-caption text-white shadow-[var(--shadow-md)]",
            side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
