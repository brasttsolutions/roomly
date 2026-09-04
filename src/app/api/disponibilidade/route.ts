import {
  buildDayBlocks,
  summariseDay,
  zonedInstant,
} from "@/modules/availability/domain";
import { daySchema } from "@/modules/availability/schemas";
import { availabilityRooms, busyIntervals } from "@/lib/server/availability";
import { clientAddress, json, rateLimit, requestId } from "@/lib/server/http";
import { logEvent } from "@/lib/server/logger";
import { isoDay } from "@/lib/utils";

/** Disponibilidade de todas as salas num dia — alimenta o filtro do catálogo. */
export async function GET(request: Request) {
  const id = requestId(request);
  if (!rateLimit(`availability:${clientAddress(request)}`, 120)) {
    return json({ error: "Muitas consultas. Aguarde um minuto." }, 429, id);
  }
  const params = new URL(request.url).searchParams;
  const parsed = daySchema.safeParse(params.get("data") ?? isoDay());
  if (!parsed.success) {
    return json(
      { error: parsed.error.issues[0]?.message ?? "Data inválida." },
      422,
      id,
    );
  }
  const requestedUnit = params.get("unidade");
  const unit = requestedUnit?.trim().toLowerCase();
  try {
    const day = parsed.data;
    const all = await availabilityRooms();
    const rooms = unit
      ? all.filter((room) => room.locationName.toLowerCase() === unit)
      : all;
    if (rooms.length === 0) {
      return json({ day, unit: requestedUnit ?? null, rooms: [] }, 200, id);
    }
    // A janela usa o fuso da primeira sala apenas para buscar; o estado de cada
    // bloco é calculado com o fuso da própria sala.
    const busy = await busyIntervals(
      rooms,
      zonedInstant(day, 0, rooms[0].config.timeZone),
      zonedInstant(day, 24 * 60, rooms[0].config.timeZone),
    );
    const now = new Date();
    return json(
      {
        day,
        unit: requestedUnit ?? null,
        rooms: rooms.map((room) => ({
          slug: room.slug,
          name: room.name,
          unit: room.locationName,
          ...summariseDay(
            day,
            buildDayBlocks({
              day,
              config: room.config,
              busy: busy.get(room.id) ?? [],
              now,
            }),
            room.config.minimumMinutes,
          ),
        })),
      },
      200,
      id,
    );
  } catch (error) {
    logEvent("error", "availability.catalog_failed", {
      requestId: id,
      error: error instanceof Error ? error.message : "unknown",
    });
    return json({ error: "Não foi possível ler a disponibilidade." }, 503, id);
  }
}
