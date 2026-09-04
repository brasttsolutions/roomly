"use client";
import { useId } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

type Common = {
  label: string;
  /** Instrução exibida abaixo do rótulo. Ligada por `aria-describedby`. */
  hint?: string;
  /** Mensagem de erro. Deve nomear o campo e o que se espera (WCAG 3.3.3). */
  error?: string;
};

function Wrapper({
  label,
  hint,
  error,
  controlId,
  hintId,
  errorId,
  children,
}: Common & {
  controlId: string;
  hintId: string;
  errorId: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      {/* O rótulo é sempre visível: placeholder não é rótulo. */}
      <label htmlFor={controlId} className="text-sm font-semibold">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="-mt-1 text-[13px] text-text-secondary">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={errorId} className="text-[13px] font-semibold text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}

const control = (error?: string) =>
  cn(
    "h-11 w-full rounded-md border bg-surface-raised px-3 text-[15px]",
    "placeholder:text-text-secondary",
    error ? "border-danger-border" : "border-border-control",
  );

export function Field({
  label,
  hint,
  error,
  className,
  ...props
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Wrapper
      label={label}
      hint={hint}
      error={error}
      controlId={id}
      hintId={`${id}-hint`}
      errorId={`${id}-error`}
    >
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hint && `${id}-hint`, error && `${id}-error`]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={cn(control(error), className)}
        {...props}
      />
    </Wrapper>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className,
  children,
  ...props
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Wrapper
      label={label}
      hint={hint}
      error={error}
      controlId={id}
      hintId={`${id}-hint`}
      errorId={`${id}-error`}
    >
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hint && `${id}-hint`, error && `${id}-error`]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={cn(control(error), className)}
        {...props}
      >
        {children}
      </select>
    </Wrapper>
  );
}

export function TextareaField({
  label,
  hint,
  error,
  className,
  ...props
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Wrapper
      label={label}
      hint={hint}
      error={error}
      controlId={id}
      hintId={`${id}-hint`}
      errorId={`${id}-error`}
    >
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hint && `${id}-hint`, error && `${id}-error`]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={cn(control(error), "h-auto py-2.5", className)}
        {...props}
      />
    </Wrapper>
  );
}

export function Checkbox({
  label,
  hint,
  className,
  ...props
}: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={cn("mt-0.5 size-4 accent-action-primary", className)}
        {...props}
      />
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {hint && (
          <span
            id={`${id}-hint`}
            className="mt-0.5 block text-xs font-normal text-text-secondary"
          >
            {hint}
          </span>
        )}
      </label>
    </div>
  );
}
