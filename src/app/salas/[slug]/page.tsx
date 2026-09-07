import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin, UsersRound } from "lucide-react";
import { BookingFlow } from "@/components/booking-flow";
import { RoomGallery } from "@/components/room-gallery";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { companyOfRoom } from "@/lib/server/company-profile";
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [room, coworking] = await Promise.all([
    catalogRoomBySlug(slug),
    companyOfRoom(slug),
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
                      {[room.location, room.floor].filter(Boolean).join(" · ")}
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
              mercadoPagoPublicKey={
                paymentMode() === "mercado_pago"
                  ? process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY
                  : undefined
              }
            />
          </div>
        </div>
      </main>
          <SiteFooter />
    </>
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
