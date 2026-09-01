import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "green" | "blue" | "coral" | "neutral";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded px-2.5 text-xs font-bold",
        tone === "green" && "bg-[#dff3e9] text-[#176b4d]",
        tone === "blue" && "bg-[#e3f0f8] text-[#286c9f]",
        tone === "coral" && "bg-[#fae7e1] text-[#a84331]",
        tone === "neutral" && "bg-[#ecefeb] text-[#53605a]",
        className,
      )}
    >
      {children}
    </span>
  );
}
