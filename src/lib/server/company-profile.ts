import "server-only";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rooms as demoRooms } from "@/lib/demo-data";
import type { Room } from "@/lib/demo-data";
import { catalogRooms } from "./catalog";

export type CompanyProfile = Readonly<{
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  units: ReadonlyArray<{ name: string; address: string; city: string }>;
  rooms: readonly Room[];
}>;

/**
 * Lê de `company_profiles`, não de `companies`. A view existe porque a RLS é por
 * linha: liberar a tabela para leitura anônima publicaria CNPJ, e-mail e
 * telefone da operação junto com o nome.
 */
export async function companyProfileBySlug(
  slug: string,
): Promise<CompanyProfile | null> {
  if (integrationMode() === "simulator") return demoProfile(slug);

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("company_profiles")
    .select("id,slug,name,description,logo_url,website_url")
    .eq("slug", slug)
    .maybeSingle();
  if (!profile) return null;

  const { data: units } = await supabase
    .from("locations")
    .select("name,address,city,rooms(slug)")
    .eq("company_id", profile.id)
    .eq("status", "active")
    .order("name");

  const slugsDoCoworking = new Set(
    (units ?? []).flatMap((unit) =>
      ((unit.rooms as Array<{ slug?: string }> | null) ?? []).map(
        (room) => room.slug,
      ),
    ),
  );

  // O catálogo já resolve foto, comodidades e preço de cada sala; refazer essa
  // montagem aqui criaria duas descrições da mesma sala.
  const catalog = await catalogRooms();
  return {
    slug: profile.slug,
    name: profile.name,
    description: profile.description,
    logoUrl: profile.logo_url,
    websiteUrl: profile.website_url,
    units: (units ?? []).map((unit) => ({
      name: unit.name,
      address: unit.address,
      city: unit.city,
    })),
    rooms: catalog.filter((room) => slugsDoCoworking.has(room.slug)),
  };
}

/** O coworking dono de uma sala, para o link "Ver perfil" na página dela. */
export async function companyOfRoom(
  roomSlug: string,
): Promise<{ slug: string; name: string } | null> {
  if (integrationMode() === "simulator") {
    const demo = demoProfile(DEMO_SLUG);
    return demo ? { slug: demo.slug, name: demo.name } : null;
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("rooms")
    .select("company_id")
    .eq("slug", roomSlug)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;
  const { data: profile } = await supabase
    .from("company_profiles")
    .select("slug,name")
    .eq("id", data.company_id)
    .maybeSingle();
  return profile ? { slug: profile.slug, name: profile.name } : null;
}

const DEMO_SLUG = "agora-coworking";

function demoProfile(slug: string): CompanyProfile | null {
  if (slug !== DEMO_SLUG) return null;
  return {
    slug: DEMO_SLUG,
    name: "Ágora Coworking",
    description:
      "Espaços de trabalho em Joinville, com salas equipadas para reuniões, entrevistas e trabalho focado.",
    logoUrl: null,
    websiteUrl: null,
    units: [
      {
        name: "Ágora Tech Park",
        address: "Perini Business Park",
        city: "Joinville",
      },
      { name: "Centro Joinville", address: "Rua do Príncipe", city: "Joinville" },
    ],
    rooms: demoRooms,
  };
}
