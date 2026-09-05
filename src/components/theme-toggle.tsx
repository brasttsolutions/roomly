"use client";
import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export const THEME_KEY = "roomly:theme";
type Theme = "system" | "light" | "dark";

const OPTIONS: Array<{ value: Theme; label: string; Icon: typeof Sun }> = [
  { value: "light", label: "Tema claro", Icon: Sun },
  { value: "system", label: "Tema do sistema", Icon: Monitor },
  { value: "dark", label: "Tema escuro", Icon: Moon },
];

/**
 * Três estados, não dois. "Sistema" não é o mesmo que "claro": quem deixa o
 * sistema decidir quer que a página acompanhe o pôr do sol junto com o resto do
 * aparelho, e é por isso que ele não carimba `data-theme`.
 */
/** O atributo no `<html>` é a fonte da verdade: o script inline já o aplicou
 *  antes da primeira pintura, e o componente apenas o observa. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function readTheme(): Theme {
  const stored = document.documentElement.getAttribute("data-theme");
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system");

  function choose(value: Theme) {
    // `setAttribute` e não `dataset`: o compilador do React recusa a mutação
    // direta de propriedade em objeto que ele não controla.
    if (value === "system") {
      document.documentElement.removeAttribute("data-theme");
      localStorage.removeItem(THEME_KEY);
    } else {
      document.documentElement.setAttribute("data-theme", value);
      localStorage.setItem(THEME_KEY, value);
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border-subtle p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => choose(value)}
          className={cn(
            "grid size-8 place-items-center rounded-full",
            theme === value
              ? "bg-surface-sunken text-text-primary"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          <Icon size={15} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
