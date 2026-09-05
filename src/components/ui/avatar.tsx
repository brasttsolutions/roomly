import { cn } from "@/lib/utils";

const SIZES = { sm: "size-6 text-caption", md: "size-8 text-caption", lg: "size-10 text-subheadline" };

/**
 * Iniciais sobre navy quando não há foto. `aria-hidden` quando o nome já está
 * escrito ao lado — repetir o nome duas vezes no leitor de tela só atrapalha.
 */
export function Avatar({
  name,
  size = "md",
  labelled = false,
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  /** `true` quando o nome aparece ao lado, em texto. */
  labelled?: boolean;
  className?: string;
}) {
  return (
    <span
      role={labelled ? undefined : "img"}
      aria-hidden={labelled || undefined}
      aria-label={labelled ? undefined : name}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-[var(--color-navy-700)] font-bold text-white",
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return (first + last).toLocaleUpperCase("pt-BR");
}
