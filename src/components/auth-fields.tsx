"use client";
import { useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";

const CAMPO =
  "mt-2 h-11 w-full rounded-md border border-[var(--border-control)] px-3 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-link)]";

/**
 * Campo de senha com mostrar/ocultar. O olho é um botão de verdade, com rótulo
 * que muda de estado — quem usa leitor de tela ouve "Mostrar senha" e depois
 * "Ocultar senha", em vez de um ícone mudo.
 */
export function PasswordField({
  label,
  name,
  autoComplete,
  minLength,
  requisito,
}: {
  label: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  /** Mostra a régua de requisitos abaixo do campo, validada ao digitar. */
  requisito?: boolean;
}) {
  const [visivel, setVisivel] = useState(false);
  const [valor, setValor] = useState("");
  const dicaId = useId();
  return (
    <div>
      <label className="block text-subheadline font-bold">
        {label}
        <div className="relative">
          <input
            type={visivel ? "text" : "password"}
            name={name}
            autoComplete={autoComplete}
            minLength={minLength}
            required
            placeholder="••••••••"
            aria-describedby={requisito ? dicaId : undefined}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className={`${CAMPO} pr-11`}
          />
          <button
            type="button"
            onClick={() => setVisivel((v) => !v)}
            aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={visivel}
            className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-text-secondary hover:bg-surface-page"
          >
            {visivel ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </label>
      {requisito && (
        <ul id={dicaId} className="mt-2 space-y-1">
          <Requisito ok={valor.length >= (minLength ?? 10)}>
            Pelo menos {minLength ?? 10} caracteres
          </Requisito>
          <Requisito ok={/[a-zA-Z]/.test(valor) && /[0-9]/.test(valor)}>
            Letras e números
          </Requisito>
        </ul>
      )}
    </div>
  );
}

function Requisito({
  ok,
  children,
}: {
  ok: boolean;
  children: React.ReactNode;
}) {
  return (
    <li
      className={`flex items-center gap-1.5 text-caption ${
        ok ? "text-success-text" : "text-text-secondary"
      }`}
    >
      <span
        className={`grid size-4 shrink-0 place-items-center rounded-full ${
          ok ? "bg-success-surface" : "border border-border-control"
        }`}
      >
        {ok && <Check size={11} aria-hidden="true" />}
      </span>
      {children}
    </li>
  );
}

/**
 * Botão de envio que reflete o estado do formulário: enquanto a ação do
 * servidor corre, ele desabilita e mostra o giro, para a pessoa não clicar de
 * novo achando que não pegou.
 */
export function SubmitButton({
  children,
  pendingLabel,
}: {
  children: React.ReactNode;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-action-primary text-subheadline font-bold text-text-on-accent transition-colors hover:bg-action-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 size={17} className="animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
