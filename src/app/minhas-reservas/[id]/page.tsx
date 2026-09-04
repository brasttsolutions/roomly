import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ExtendBooking } from "@/components/extend-booking";
import { AccessCredentialCard } from "@/components/ui/access-credential-card";
import { Badge } from "@/components/ui/badge";
import { bookingDetail } from "@/lib/server/booking-detail";
import { capitalizeFirst, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Detalhe da reserva" };
export const dynamic = "force-dynamic";

const STATUS: Record<
  string,
  { label: string; tone: "success" | "warning" | "info" | "neutral" | "danger" }
> = {
  awaiting_payment: { label: "Aguardando pagamento", tone: "warning" },
  confirmed: { label: "Confirmada", tone: "success" },
  in_progress: { label: "Em andamento", tone: "info" },
  completed: { label: "Concluída", tone: "neutral" },
  cancelled: { label: "Cancelada", tone: "neutral" },
  expired: { label: "Expirada", tone: "danger" },
  refunded: { label: "Reembolsada", tone: "info" },
  manual_review: { label: "Em revisão", tone: "warning" },
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const booking = await bookingDetail((await params).id);
  if (!booking) notFound();

  const status = STATUS[booking.status] ?? {
    label: booking.status,
    tone: "neutral" as const,
  };
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
        <Link
          href="/minhas-reservas"
          className="inline-flex items-center gap-1 text-sm font-bold text-text-secondary"
        >
          <ChevronLeft size={17} aria-hidden="true" />
          Minhas reservas
        </Link>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div>
            <Badge tone={status.tone}>{status.label}</Badge>
            <h1 className="mt-3 text-3xl font-bold">{booking.roomName}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-text-secondary">
              <MapPin size={15} aria-hidden="true" />
              {[booking.unit, booking.address].filter(Boolean).join(" · ")}
            </p>

            <dl className="mt-6 grid gap-4 rounded-lg border border-border-subtle bg-surface-raised p-5 sm:grid-cols-3">
              <Fact label="Data" value={capitalizeFirst(date)} />
              <Fact label="Horário" value={window} />
              <Fact label="Total" value={formatMoney(booking.totalCents)} />
            </dl>

            {booking.extension && (
              <div className="mt-6">
                <ExtendBooking
                  bookingId={booking.id}
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
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase text-text-secondary">
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
