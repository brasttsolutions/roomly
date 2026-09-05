"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "danger" | "info";
type Toast = { id: number; tone: Tone; message: string };

const ToastContext = createContext<((tone: Tone, message: string) => void) | null>(
  null,
);

/** Avisa sobre o que aconteceu longe de onde a pessoa está olhando. */
export function useToast() {
  const push = useContext(ToastContext);
  return push ?? (() => {});
}

const ICONS = { success: CircleCheck, danger: CircleAlert, info: Info };

/**
 * Canto inferior direito no desktop, topo no telefone, no máximo três
 * empilhados. Sucesso some em 5s; **erro não some sozinho** — quem não estava
 * olhando na hora perderia a única notícia de que algo falhou.
 *
 * Erro de formulário não vem por aqui: ele pertence ao campo.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(0);

  const push = useCallback((tone: Tone, message: string) => {
    const id = (next.current += 1);
    // Três é o teto: uma pilha maior cobre a tela em vez de informar.
    setToasts((current) => [...current.slice(-2), { id, tone, message }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 top-4 z-[var(--z-toast)] flex flex-col gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:w-80"
        // A região é fixa no DOM para o leitor de tela observar as mudanças;
        // o conteúdo é que entra e sai.
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  const [paused, setPaused] = useState(false);
  const Icon = ICONS[toast.tone];
  const permanent = toast.tone === "danger";

  useEffect(() => {
    if (permanent || paused) return;
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [permanent, paused, toast.id, onDismiss]);

  return (
    <div
      role={permanent ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-md border-l-[3px] p-4 text-subheadline shadow-[var(--shadow-lg)]",
        toast.tone === "success" &&
          "border-success-border bg-success-surface text-success-text",
        toast.tone === "danger" &&
          "border-danger-border bg-danger-surface text-danger-text",
        toast.tone === "info" &&
          "border-info-border bg-info-surface text-info-text",
      )}
    >
      <Icon size={18} className="mt-px shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">{toast.message}</p>
      <button
        type="button"
        aria-label="Dispensar aviso"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-sm p-0.5 hover:opacity-70"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
