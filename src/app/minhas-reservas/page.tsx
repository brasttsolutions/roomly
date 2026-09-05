import type { Metadata } from "next";
import { CustomerBookings } from "@/components/customer-bookings";
import { SiteHeader } from "@/components/site-header";
import { customerBookings } from "@/lib/server/customer-bookings";
export const metadata: Metadata = { title: "Minhas reservas" };
export const dynamic = "force-dynamic";
export default async function Page() {
  const bookings = await customerBookings();
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
        <div className="mb-7">
          <p className="text-subheadline font-bold text-text-link">SUA CONTA</p>
          <h1 className="mt-1 text-title1 font-bold">Minhas reservas</h1>
          <p className="mt-2 text-subheadline text-text-secondary">
            Acesso, pagamentos e histórico em um só lugar.
          </p>
        </div>
        <CustomerBookings
          current={bookings?.current ?? null}
          history={bookings?.history}
        />
      </main>
    </>
  );
}
