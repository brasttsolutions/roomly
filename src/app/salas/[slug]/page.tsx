import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, UsersRound } from "lucide-react";
import { BookingFlow } from "@/components/booking-flow";
import { RoomGallery } from "@/components/room-gallery";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { rooms } from "@/lib/demo-data";
import { isoDay } from "@/lib/utils";
import { catalogRoomBySlug } from "@/lib/server/catalog";
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
  const room = await catalogRoomBySlug(slug);
  if (!room) notFound();
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-1 text-sm font-bold text-[#53605a]"
        >
          <ChevronLeft size={17} />
          Todas as salas
        </Link>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
          <div>
            <RoomGallery
              name={room.name}
              images={room.images?.length ? room.images : [room.image]}
            />
            <div className="py-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-[#66736d]">
                    <MapPin size={16} />
                    {[room.location, room.floor].filter(Boolean).join(" · ")}
                  </p>
                  {room.address && (
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {room.address}
                    </p>
                  )}
                  <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                    {room.name}
                  </h1>
                </div>
                <Badge tone="green">
                  <UsersRound size={14} className="mr-1.5" />
                  até {room.capacity} pessoas
                </Badge>
              </div>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#65716c]">
                {room.description} A sala é preparada entre cada reserva e o
                acesso é liberado automaticamente no horário contratado.
              </p>
              <div className="mt-6 border-y border-[#dfe4df] py-5">
                <h2 className="mb-3 text-sm font-bold">O que você encontra</h2>
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
                process.env.ROOMLY_PAYMENT_MODE === "mercado_pago"
                  ? process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY
                  : undefined
              }
            />
          </div>
        </div>
      </main>
    </>
  );
}
function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
