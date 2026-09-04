"use client";
import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function RoomGallery({
  name,
  images,
}: {
  name: string;
  images: readonly string[];
}) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];
  return (
    <div>
      <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-[#e7eae6]">
        <Image
          src={current}
          alt={name}
          fill
          priority
          sizes="(max-width:1024px) 100vw,70vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label={`Fotos de ${name}`}>
          {images.map((image, index) => (
            <li key={image}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-current={index === active}
                aria-label={`Foto ${index + 1} de ${images.length}`}
                className={cn(
                  "relative size-20 overflow-hidden rounded-md border-2 bg-[#e7eae6] transition",
                  index === active
                    ? "border-[#176b4d]"
                    : "border-transparent hover:border-[var(--border-control)]",
                )}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
