import Image from "next/image";
import Link from "next/link";
import { CalendarClock, MapPin, UsersRound } from "lucide-react";
import type { Room } from "@/lib/demo-data";
import type { RoomDayAvailability } from "./use-availability";
import { formatIsoDay, formatMoney } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Tooltip } from "./ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * O card mais importante do produto: é onde a decisão de reservar começa. A
 * linha de horários é o que o separa de um card de e-commerce — responde
 * "posso usar hoje?" sem exigir clique.
 */
export function RoomCard({
  room,
  availability,
  loading = false,
  featured = false,
}: {
  room: Room;
  availability?: RoomDayAvailability;
  loading?: boolean;
  featured?: boolean;
}) {
  const closed =
    availability?.state === "full" ||
    availability?.state === "past" ||
    availability?.state === "closed";
  return (
    <article
      className={cn(
        "group overflow-hidden rounded-lg border border-border-subtle bg-surface-raised",
        featured && "grid lg:grid-cols-[1.35fr_1fr]",
      )}
    >
      {/* Um destino, um link: a foto deixou de ser link para o leitor de tela
          anunciar "Sala Executiva, link" uma vez, e não o card inteiro duas. */}
      <div
        className={cn(
          "relative overflow-hidden",
          featured ? "min-h-[280px] lg:min-h-[410px]" : "aspect-[4/3]",
        )}
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
          className={cn(
            "object-cover transition duration-500 group-hover:scale-[1.025]",
            closed && "opacity-60",
          )}
          priority={featured}
        />
        {featured && (
          <Badge tone="accent" className="absolute left-4 top-4">
            Mais reservada
          </Badge>
        )}
      </div>
      <div
        className={cn(
          "flex flex-col justify-between",
          featured ? "p-6 sm:p-8" : "p-5",
        )}
      >
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-caption font-semibold text-text-secondary">
            <MapPin size={14} aria-hidden="true" />
            {room.location}
          </p>
          {/* h3: o nome da sala vive sob o "Disponíveis hoje" da lista, e um h2
              aqui quebraria o sumário do documento. */}
          <h3
            className={
              featured ? "text-title2 font-bold sm:text-title1" : "text-title3 font-bold"
            }
          >
            <Link
              href={`/salas/${room.slug}`}
              className="hover:text-text-link focus-visible:text-text-link"
            >
              {room.name}
            </Link>
          </h3>
          {room.address && (
            <p className="mt-1 text-caption text-text-secondary">{room.address}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>
              <UsersRound size={13} aria-hidden="true" /> até {room.capacity}
            </Badge>
            <RoomAmenities
              features={room.features}
              visible={featured ? 4 : 2}
            />
          </div>

          <div className="mt-4 min-h-11">
            {loading ? (
              <Skeleton className="h-7 w-48" />
            ) : (
              <AvailabilityLine availability={availability} />
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-border-subtle pt-4">
          <p>
            <span className="block text-caption text-text-secondary">
              a partir de
            </span>
            <span
              className="text-title3 font-bold"
              aria-label={`${Math.round(room.hourlyPriceCents / 100)} reais por hora`}
            >
              {formatMoney(room.hourlyPriceCents)}
              <span className="text-subheadline font-normal text-text-secondary">
                {" "}
                / hora
              </span>
            </span>
          </p>
          <Link
            href={`/salas/${room.slug}`}
            data-testid={`book-${room.slug}`}
            className={cn(
              "inline-flex h-11 shrink-0 items-center justify-center rounded-md px-5 text-subheadline font-bold",
              closed
                ? "border border-border-control text-text-primary hover:bg-surface-page"
                : "bg-action-primary text-text-on-accent hover:bg-action-primary-hover",
            )}
          >
            {closed ? "Ver agenda" : "Reservar"}
          </Link>
        </div>
      </div>
    </article>
  );
}

/**
 * Ícone sempre com texto: um pictograma de TV não distingue "TV 50" de "TV 65"
 * nem informa se há câmera — e câmera em sala de reunião é informação sensível
 * de privacidade, que nunca pode depender de desenho.
 *
 * O "+2" deixou de ser um selo morto: ele diz quais são os outros.
 */
function RoomAmenities({
  features,
  visible,
}: {
  features: readonly string[];
  visible: number;
}) {
  const rest = features.slice(visible);
  return (
    <>
      {features.slice(0, visible).map((feature) => (
        <Badge key={feature}>{feature}</Badge>
      ))}
      {rest.length > 0 && (
        <Tooltip content={rest.join(" · ")}>
          <Badge
            tabIndex={0}
            aria-label={`Mais ${rest.length}: ${rest.join(", ")}`}
            className="cursor-help"
          >
            +{rest.length}
          </Badge>
        </Tooltip>
      )}
    </>
  );
}

function AvailabilityLine({
  availability,
}: {
  availability?: RoomDayAvailability;
}) {
  if (!availability) return null;

  if (availability.nextFreeTimes.length > 0) {
    return (
      <p className="flex flex-wrap items-center gap-2 text-subheadline">
        <Badge tone="success">Livre</Badge>
        <span className="font-semibold tabular-nums">
          {availability.nextFreeTimes.join(" · ")}
        </span>
        {availability.free > availability.nextFreeTimes.length && (
          <span className="text-text-secondary">
            +{availability.free - availability.nextFreeTimes.length}
          </span>
        )}
      </p>
    );
  }

  if (availability.nextDay) {
    return (
      <p className="flex flex-wrap items-center gap-2 text-subheadline">
        <Badge>
          <CalendarClock size={13} aria-hidden="true" />
          Próximo
        </Badge>
        <span className="font-semibold">
          {formatIsoDay(availability.nextDay.day)} às{" "}
          {availability.nextDay.time}
        </span>
      </p>
    );
  }

  return (
    <p className="text-subheadline">
      <Badge tone="warning">Sem horário nas próximas duas semanas</Badge>
    </p>
  );
}
