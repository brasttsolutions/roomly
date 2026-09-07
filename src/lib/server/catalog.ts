import "server-only";
import { createClient } from "@supabase/supabase-js";
import { rooms as demoRooms, type Room } from "@/lib/demo-data";
import {
  integrationMode,
  requireSupabasePublicConfig,
} from "@/lib/supabase/config";

export async function catalogRooms(): Promise<readonly Room[]> {
  if (integrationMode() === "simulator") return demoRooms;
  const config = requireSupabasePublicConfig();
  const supabase = createClient(config.url, config.anonKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase
    .from("rooms")
    .select(
      "id,slug,name,description,capacity,hourly_price_cents,size_sqm,has_wifi,has_air_conditioning,has_coffee,has_parking,map_url,arrival_instructions,companies(name),locations(name,address,city,state),room_images(url,position),room_feature_relations(room_features(name))",
    )
    .eq("status", "active")
    .order("name");
  if (error) throw new Error(`catalog_rooms_failed:${error.code}`);
  return (data ?? []).map(mapRoom);
}

export async function catalogRoomBySlug(slug: string) {
  return (await catalogRooms()).find((room) => room.slug === slug) ?? null;
}

function mapRoom(row: Record<string, unknown>): Room {
  const location = row.locations as {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
  } | null;
  const company = row.companies as { name?: string } | null;
  const images = row.room_images as
    Array<{ url: string; position: number }> | undefined;
  const ordered = [...(images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((image) => image.url);
  const relations = row.room_feature_relations as
    Array<{ room_features?: { name?: string } | null }> | undefined;
  const slug = String(row.slug);
  return {
    id: String(row.id),
    slug,
    name: String(row.name),
    description: String(row.description),
    image:
      ordered[0] ??
      demoRooms.find((room) => room.slug === slug)?.image ??
      "/rooms/executiva.png",
    images: ordered,
    address: [
      location?.address,
      [location?.city, location?.state].filter(Boolean).join("/"),
    ]
      .filter(Boolean)
      .join(" · "),
    capacity: Number(row.capacity),
    hourlyPriceCents: Number(row.hourly_price_cents),
    coworking: company?.name ?? undefined,
    // Vazio quando a sala não tem unidade vinculada. O card decide o que
    // mostrar — "Unidade" fixo aqui era o rótulo genérico que quebrava a
    // sensação de produto pronto.
    location: location?.name ?? "",
    floor: "",
    features:
      relations
        ?.map((relation) => relation.room_features?.name)
        .filter((name): name is string => Boolean(name)) ?? [],
    accent: demoRooms.find((room) => room.slug === slug)?.accent ?? "green",
    sizeSqm: row.size_sqm != null ? Number(row.size_sqm) : undefined,
    hasWifi: Boolean(row.has_wifi),
    hasAirConditioning: Boolean(row.has_air_conditioning),
    hasCoffee: Boolean(row.has_coffee),
    hasParking: Boolean(row.has_parking),
    mapUrl: (row.map_url as string | null) ?? undefined,
    arrivalInstructions: (row.arrival_instructions as string | null) ?? undefined,
  };
}
