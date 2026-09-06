import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Building2, ExternalLink, MapPin } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { RoomCard } from "@/components/room-card";
import { SiteHeader } from "@/components/site-header";
import { companyProfileBySlug } from "@/lib/server/company-profile";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const profile = await companyProfileBySlug((await params).slug);
  if (!profile) return { title: "Coworking não encontrado" };
  return {
    title: profile.name,
    description:
      profile.description ??
      `Salas para reserva em ${profile.units.map((unit) => unit.city).join(", ")}.`,
  };
}

export default async function CoworkingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const profile = await companyProfileBySlug((await params).slug);
  if (!profile) notFound();

  return (
    <>
      <SiteHeader />
      <main
        id="conteudo"
        className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8"
      >
        <Breadcrumbs
          className="mb-5"
          items={[{ label: "Todas as salas", href: "/" }, { label: profile.name }]}
        />

        <header className="flex flex-wrap items-start gap-5 border-b border-border-subtle pb-7">
          <Logo name={profile.name} url={profile.logoUrl} />
          <div className="min-w-0 flex-1">
            <p className="text-subheadline font-bold text-text-link">COWORKING</p>
            <h1 className="mt-1 text-title1 font-bold sm:text-headline">
              {profile.name}
            </h1>
            {profile.description && (
              <p className="mt-3 max-w-2xl text-body leading-7 text-text-secondary">
                {profile.description}
              </p>
            )}
            {profile.websiteUrl && (
              <a
                href={profile.websiteUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-3 inline-flex items-center gap-1.5 text-subheadline font-bold text-text-link hover:underline"
              >
                Site do coworking
                {/* O ícone diz que sai do Roomly; o rótulo diz para onde vai. */}
                <ExternalLink size={15} aria-hidden="true" />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            )}
          </div>
        </header>

        {profile.units.length > 0 && (
          <section className="mt-7" aria-labelledby="unidades">
            <h2 id="unidades" className="text-title3 font-bold">
              {profile.units.length === 1 ? "Unidade" : "Unidades"}
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {profile.units.map((unit) => (
                <li
                  key={unit.name}
                  className="rounded-lg border border-border-subtle bg-surface-raised p-4"
                >
                  <p className="font-bold">{unit.name}</p>
                  <p className="mt-1 flex items-start gap-1.5 text-caption text-text-secondary">
                    <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {[unit.address, unit.city].filter(Boolean).join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-9" aria-labelledby="salas">
          <h2 id="salas" className="text-title3 font-bold">
            {profile.rooms.length === 1
              ? "1 sala disponível"
              : `${profile.rooms.length} salas disponíveis`}
          </h2>
          {profile.rooms.length === 0 ? (
            <EmptyState
              className="mt-4"
              title="Nenhuma sala publicada ainda"
              description="Este coworking ainda não deixou nenhuma sala disponível para reserva."
            />
          ) : (
            <div className="mt-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {profile.rooms.map((room) => (
                <RoomCard key={room.slug} room={room} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

/**
 * Sem logo, as iniciais. Um espaço vazio faria o cabeçalho parecer quebrado, e
 * um ícone genérico não distingue um coworking do outro.
 */
function Logo({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={88}
        height={88}
        className="size-[88px] shrink-0 rounded-lg border border-border-subtle object-cover"
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      aria-hidden="true"
      className="grid size-[88px] shrink-0 place-items-center rounded-lg bg-surface-inverse text-title1 font-bold text-white"
    >
      {initials || <Building2 size={32} />}
    </div>
  );
}
