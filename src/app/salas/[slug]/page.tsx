import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin, UsersRound } from "lucide-react";
import { BookingFlow } from "@/components/booking-flow";
import { TrustBadges } from "@/components/trust-badges";
import { RoomGallery } from "@/components/room-gallery";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { companyOfRoom } from "@/lib/server/company-profile";
import { requestCustomer } from "@/lib/server/customer";
import { rooms } from "@/lib/demo-data";
import { isoDay } from "@/lib/utils";
import { catalogRoomBySlug } from "@/lib/server/catalog";
import { paymentMode } from "@/lib/modes";
import Link from "next/link";
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const room = await catalogRoomBySlug((await params).slug);
  if (!room) return { title: "Sala não encontrada" };
  return {
    title: room.name,
    description: `${room.name} em ${room.location}. Até ${room.capacity} pessoas.`,
  };
}

export function generateStaticParams() {
  return rooms.map((room) => ({ slug: room.slug }));
}

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ dia?: string; hora?: string; duracao?: string }>;
}) {
  const { slug } = await params;
  const [room, coworking, customer, resume] = await Promise.all([
    catalogRoomBySlug(slug),
    companyOfRoom(slug),
    requestCustomer(),
    searchParams.then(retomarSelecao),
  ]);
  if (!room) notFound();
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <Breadcrumbs
          className="mb-5"
          items={[
            { label: "Todas as salas", href: "/" },
            { label: room.name },
          ]}
        />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
          <div>
            <RoomGallery
              name={room.name}
              images={room.images?.length ? room.images : [room.image]}
            />
            <div className="py-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-subheadline font-semibold text-text-secondary">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={16} aria-hidden="true" />
                      {[room.location, room.floor]
                        .filter(Boolean)
                        .join(" · ") || "Unidade a confirmar"}
                    </span>
                    {/* Quem aluga quer saber de quem é a sala antes de pagar.
                        O rótulo nomeia o coworking em vez de dizer só "perfil":
                        num leitor de tela, "Ver perfil" sozinho não diz de quem. */}
                    {coworking && (
                      <Link
                        href={`/coworkings/${coworking.slug}`}
                        className="font-bold text-text-link hover:underline"
                      >
                        Ver perfil de {coworking.name}
                      </Link>
                    )}
                  </p>
                  {room.address && (
                    <p className="mt-1 text-subheadline text-[var(--text-secondary)]">
                      {room.address}
                    </p>
                  )}
                  <h1 className="mt-2 text-title1 font-bold sm:text-headline">
                    {room.name}
                  </h1>
                </div>
                <Badge tone="neutral">
                  <UsersRound size={14} className="mr-1.5" />
                  até {room.capacity} pessoas
                </Badge>
              </div>
              <p className="mt-4 max-w-2xl text-body leading-7 text-text-secondary">
                {room.description} A sala é preparada entre cada reserva e o
                acesso é liberado automaticamente no horário contratado.
              </p>
              <div className="mt-6 border-y border-border-subtle py-5">
                <h2 className="mb-3 text-subheadline font-bold">O que você encontra</h2>
                <div className="flex flex-wrap gap-2">
                  {room.features.map((f) => (
                    <Badge key={f}>{f}</Badge>
                  ))}
                </div>
              </div>
              <RoomSpace room={room} />
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <Spec label="Acesso" value="Código temporário" />
                <Spec label="Cancelamento" value="Grátis até 24h antes" />
                <Spec label="Suporte" value="Equipe no local" />
              </div>
            </div>
          </div>
          <div className="lg:sticky lg:top-24">
            <BookingFlow
              room={room}
              today={isoDay()}
              signedIn={customer !== null}
              resume={resume}
              mercadoPagoPublicKey={
                paymentMode() === "mercado_pago"
                  ? process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY
                  : undefined
              }
            />
            <TrustBadges className="mt-4 px-1" />
          </div>
        </div>
      </main>
          <SiteFooter />
    </>
  );
}
const DIA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;

/**
 * A escolha que voltou do login, conferida antes de virar estado da tela.
 *
 * Estes três valores vêm da URL, então qualquer um os digita. Nada aqui
 * autoriza coisa alguma — o preço e a disponibilidade continuam vindo do
 * servidor —, mas um valor torto viraria uma grade em branco ou uma duração
 * absurda no resumo, e conferir o formato custa três linhas.
 */
function retomarSelecao({
  dia,
  hora,
  duracao,
}: {
  dia?: string;
  hora?: string;
  duracao?: string;
}) {
  const minutos = Number(duracao);
  return {
    day: dia && DIA.test(dia) ? dia : undefined,
    time: hora && HORA.test(hora) ? hora : undefined,
    durationMinutes:
      Number.isInteger(minutos) && minutos >= 30 && minutos <= 720
        ? minutos
        : undefined,
  };
}

/**
 * "Sobre o espaço": os campos descritivos que o dono preenche no painel. Só
 * aparece o que existe — sala sem nenhum desses campos não ganha uma seção
 * vazia. As comodidades listam apenas as marcadas como presentes.
 */
function RoomSpace({
  room,
}: {
  room: {
    sizeSqm?: number;
    hasWifi?: boolean;
    hasAirConditioning?: boolean;
    hasCoffee?: boolean;
    hasParking?: boolean;
    mapUrl?: string;
    arrivalInstructions?: string;
  };
}) {
  const comodidades = [
    room.hasWifi && "Wi-Fi",
    room.hasAirConditioning && "Ar-condicionado",
    room.hasCoffee && "Café / água",
    room.hasParking && "Estacionamento",
  ].filter((item): item is string => Boolean(item));

  const temAlgo =
    room.sizeSqm ||
    comodidades.length > 0 ||
    room.mapUrl ||
    room.arrivalInstructions;
  if (!temAlgo) return null;

  return (
    <div className="mt-6 border-b border-border-subtle pb-5">
      <h2 className="mb-3 text-subheadline font-bold">Sobre o espaço</h2>
      <div className="flex flex-wrap gap-2">
        {room.sizeSqm ? <Badge>{room.sizeSqm} m²</Badge> : null}
        {comodidades.map((item) => (
          <Badge key={item}>{item}</Badge>
        ))}
      </div>
      {room.arrivalInstructions && (
        <div className="mt-4">
          <p className="text-caption font-bold uppercase text-[var(--text-secondary)]">
            Como chegar
          </p>
          <p className="mt-1 max-w-2xl whitespace-pre-line text-subheadline leading-6 text-text-secondary">
            {room.arrivalInstructions}
          </p>
        </div>
      )}
      {room.mapUrl && (
        <a
          href={room.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-subheadline font-bold text-text-link hover:underline"
        >
          <MapPin size={15} aria-hidden="true" />
          Ver no mapa
        </a>
      )}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-caption font-bold uppercase text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1 text-subheadline font-semibold">{value}</p>
    </div>
  );
}
