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
            ? "grid size-9 place-items-center rounded-md bg-white text-[#176b4d]"
            : "grid size-9 place-items-center rounded-md bg-[#176b4d] text-white"
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
