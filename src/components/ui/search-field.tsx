"use client";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Campo de busca de verdade: `type="search"`, botão de limpar quando há texto e
 * o resultado anunciado por região viva. Um `<input>` com lupa ao lado não
 * avisa a ninguém que a lista mudou.
 */
export function SearchField({
  name = "q",
  label,
  defaultValue = "",
  placeholder = "Buscar",
  resultLabel,
  className,
}: {
  name?: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  /** Texto anunciado depois da busca, do tipo "12 salas encontradas". */
  resultLabel?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center rounded-md border border-border-subtle">
        <span className="grid size-10 shrink-0 place-items-center text-text-secondary">
          <Search size={17} aria-hidden="true" />
        </span>
        <input
          type="search"
          name={name}
          aria-label={label}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className="h-10 min-w-0 flex-1 bg-transparent text-subheadline"
        />
        {value && (
          <button
            type="submit"
            aria-label="Limpar busca"
            onClick={() => setValue("")}
            className="grid size-10 shrink-0 place-items-center text-text-secondary hover:text-text-primary"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
        <button
          type="submit"
          className="h-10 rounded-r-md border-l border-border-subtle px-3 text-subheadline font-semibold hover:bg-surface-page"
        >
          Buscar
        </button>
      </div>
      {resultLabel && (
        <p role="status" aria-live="polite" className="sr-only">
          {resultLabel}
        </p>
      )}
    </div>
  );
}
