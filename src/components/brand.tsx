import Link from "next/link";
import { DoorOpen } from "lucide-react";
export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5"
      aria-label="roomly, página inicial"
    >
      <span
        className={
          inverse
            // Branco literal: a marca invertida vive sobre a barra navy, que
            // continua escura nos dois temas.
            ? "grid size-9 place-items-center rounded-md bg-white text-text-link"
            : "grid size-9 place-items-center rounded-md bg-action-primary text-text-on-accent"
        }
      >
        <DoorOpen size={20} />
      </span>
      {/* Abaixo de 360px o ícone carrega a marca sozinho. A palavra custa uns
          70px, e é ela que empurrava o seletor de tema e a conta para fora da
          tela num iPhone SE. O `aria-label` do link continua dizendo "roomly". */}
      <span
        className={
          inverse
            ? "hidden text-title3 font-bold text-white min-[360px]:inline"
            : "hidden text-title3 font-bold min-[360px]:inline"
        }
      >
        roomly
      </span>
    </Link>
  );
}
