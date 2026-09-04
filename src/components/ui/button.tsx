import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
};
export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: Props) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold transition disabled:opacity-50",
        variant === "primary" && "bg-[#176b4d] text-white hover:bg-[#11543d]",
        variant === "secondary" &&
          "border border-[var(--border-control)] bg-white hover:bg-[#f0f3ef]",
        variant === "ghost" && "text-[#4e5b55] hover:bg-[#e9ece8]",
        variant === "danger" && "bg-[#b94332] text-white",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm",
        size === "icon" && "size-10 p-0",
        className,
      )}
      {...props}
    />
  );
}
