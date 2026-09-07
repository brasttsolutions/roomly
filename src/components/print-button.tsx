"use client";
import { Printer } from "lucide-react";

/**
 * Aciona a impressão do navegador, que também é o caminho para "Salvar como
 * PDF". Fica escondido na própria impressão (`print:hidden`) para não sair no
 * papel. Sem backend de PDF: o comprovante é a própria página, bem formatada.
 */
export function PrintButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-11 items-center gap-2 rounded-md bg-action-primary px-5 text-subheadline font-bold text-text-on-accent hover:bg-action-primary-hover print:hidden"
    >
      <Printer size={17} aria-hidden="true" />
      {children}
    </button>
  );
}
