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
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
        <div className="mb-7">
          <p className="text-sm font-bold text-[#176b4d]">SUA CONTA</p>
          <h1 className="mt-1 text-3xl font-bold">Minhas reservas</h1>
          <p className="mt-2 text-sm text-[#66736d]">
            Acesso, pagamentos e histórico em um só lugar.
          </p>
        </div>
        <CustomerBookings
          current={bookings === null ? undefined : bookings.current}
          history={bookings?.history}
        />
      </main>
    </>
  );
}
