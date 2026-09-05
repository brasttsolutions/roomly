import type { Metadata } from "next";
import { CatalogBrowser } from "@/components/catalog-browser";
import { SiteHeader } from "@/components/site-header";
import { catalogRooms } from "@/lib/server/catalog";
import { isoDay } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Salas no seu tempo",
  description:
    "Reserve salas de reunião prontas para receber você. Pague, receba o código de acesso e entre.",
};
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const rooms = await catalogRooms();
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="mb-7 max-w-2xl">
          <p className="mb-2 text-subheadline font-bold text-text-link">JOINVILLE, SC</p>
          <h1 className="text-title1 font-bold leading-tight sm:text-headline">
            Uma sala pronta quando você precisar.
          </h1>
          <p className="mt-3 max-w-xl text-body leading-7 text-text-secondary">
            Escolha o espaço, reserve seu horário e receba o acesso sem espera.
          </p>
        </div>
        <CatalogBrowser
          rooms={rooms}
          units={[...new Set(rooms.map((room) => room.location))].sort()}
          today={isoDay()}
        />
      </main>
    </>
  );
}
