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
            ? "grid size-9 place-items-center rounded-md bg-white text-text-link"
            : "grid size-9 place-items-center rounded-md bg-action-primary text-text-on-accent"
        }
      >
        <DoorOpen size={20} />
      </span>
      <span
        className={
          inverse ? "text-xl font-bold text-white" : "text-xl font-bold"
        }
      >
        roomly
      </span>
    </Link>
  );
}
