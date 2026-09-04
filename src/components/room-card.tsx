import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, UsersRound } from "lucide-react";
import type { Room } from "@/lib/demo-data";
import { formatMoney } from "@/lib/utils";
import { Badge } from "./ui/badge";
export function RoomCard({
  room,
  featured = false,
}: {
  room: Room;
  featured?: boolean;
}) {
  return (
    <article
      className={
        featured
          ? "group grid overflow-hidden rounded-lg border border-border-subtle bg-white lg:grid-cols-[1.35fr_1fr]"
          : "group overflow-hidden rounded-lg border border-border-subtle bg-white"
      }
    >
      <Link
        href={`/salas/${room.slug}`}
        className={
          featured
            ? "relative block min-h-[280px] overflow-hidden lg:min-h-[410px]"
            : "relative block aspect-[4/3] overflow-hidden"
        }
      >
        <Image
          src={room.image}
          alt={room.name}
          fill
          sizes={
            featured
              ? "(max-width:1024px) 100vw,55vw"
              : "(max-width:768px) 100vw,40vw"
          }
          className="object-cover transition duration-500 group-hover:scale-[1.025]"
          priority={featured}
        />
        {featured && (
          <Badge tone="accent" className="absolute left-4 top-4">
            Mais reservada
          </Badge>
        )}
      </Link>
      <div
        className={
          featured ? "flex flex-col justify-between p-6 sm:p-8" : "p-5"
        }
      >
        <div>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
                <MapPin size={14} />
                {room.location}
              </p>
              <h2
                className={
                  featured
                    ? "text-2xl font-bold sm:text-3xl"
                    : "text-xl font-bold"
                }
              >
                {room.name}
              </h2>
            </div>
            <Link
              href={`/salas/${room.slug}`}
              aria-label={`Ver ${room.name}`}
              title={`Ver ${room.name}`}
              className="grid size-10 shrink-0 place-items-center rounded-md border border-[var(--border-control)] text-text-link hover:bg-action-primary hover:text-text-on-accent"
            >
              <ArrowUpRight size={19} />
            </Link>
          </div>
          <p className="mb-5 text-sm leading-6 text-text-secondary">
            {room.description}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge>
              <UsersRound size={13} className="mr-1" /> até {room.capacity}
            </Badge>
            {room.features.slice(0, featured ? 4 : 2).map((f) => (
              <Badge key={f}>{f}</Badge>
            ))}
          </div>
        </div>
        <div
          className={
            featured
              ? "mt-10 border-t border-border-subtle pt-5"
              : "mt-5 border-t border-border-subtle pt-4"
          }
        >
          <span className="text-xs text-text-secondary">a partir de</span>
          <p className="text-xl font-bold">
            {formatMoney(room.hourlyPriceCents)}
            <span className="text-sm font-normal text-text-secondary"> / hora</span>
          </p>
        </div>
      </div>
    </article>
  );
}
