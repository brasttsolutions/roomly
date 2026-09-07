import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, MapPin } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ExtendBooking } from "@/components/extend-booking";
import { AccessCredentialCard } from "@/components/ui/access-credential-card";
import { BookingStatus } from "@/components/ui/booking-status";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { bookingDetail } from "@/lib/server/booking-detail";
import { capitalizeFirst, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Detalhe da reserva" };
export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const booking = await bookingDetail((await params).id);
  if (!booking) notFound();

  const date = new Intl.DateTimeFormat("pt-BR", {
    timeZone: booking.timeZone,
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(booking.startAt));
  const window = `${clock(booking.startAt, booking.timeZone)} – ${clock(booking.endAt, booking.timeZone)}`;

  return (
    <>
      <SiteHeader />
      <main
        id="conteudo"
        className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-10"
      >
        <Breadcrumbs
          items={[
            { label: "Minhas reservas", href: "/minhas-reservas" },
            { label: booking.roomName },
          ]}
        />

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <div>
            <BookingStatus value={booking.status} />
            <h1 className="mt-3 text-title1 font-bold">{booking.roomName}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-subheadline text-text-secondary">
              <MapPin size={15} aria-hidden="true" />
              {[booking.unit, booking.address].filter(Boolean).join(" · ")}
            </p>

            <dl className="mt-6 grid gap-4 rounded-lg border border-border-subtle bg-surface-raised p-5 sm:grid-cols-3">
              <Fact label="Data" value={capitalizeFirst(date)} />
              <Fact label="Horário" value={window} />
              <Fact label="Total" value={formatMoney(booking.totalCents)} />
            </dl>

            <Link
              href={`/minhas-reservas/${booking.id}/comprovante`}
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-md border border-border-control px-4 text-subheadline font-semibold hover:bg-surface-page"
            >
              <FileText size={16} aria-hidden="true" />
              Baixar comprovante
            </Link>

            {booking.extension && (
              <div className="mt-6">
                <ExtendBooking
                  roomId={booking.roomId}
                  endAt={booking.endAt}
                  offer={booking.extension}
                  timeZone={booking.timeZone}
                />
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <AccessCredentialCard
              status={booking.credential.status}
              validFrom={booking.credential.validFrom}
              validUntil={booking.credential.validUntil}
              fingerprint={booking.credential.fingerprint}
              roomName={booking.roomName}
              timeZone={booking.timeZone}
              bookingId={booking.id}
            />
          </aside>
        </div>
      </main>
          <SiteFooter />
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption font-bold uppercase text-text-secondary">
        {label}
      </dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

const clock = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
