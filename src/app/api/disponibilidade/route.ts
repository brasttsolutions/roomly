import {
  buildDayBlocks,
  summariseDay,
  zonedInstant,
} from "@/modules/availability/domain";
import type { AvailabilityConfig, BusyInterval } from "@/modules/availability/domain";
import { daySchema } from "@/modules/availability/schemas";
import { availabilityRooms, busyIntervals } from "@/lib/server/availability";
import { clientAddress, json, rateLimit, requestId } from "@/lib/server/http";
import { logEvent } from "@/lib/server/logger";
import { addIsoDays, isoDay } from "@/lib/utils";

/** Dias à frente que o catálogo olha para responder "e quando, então?". */
const LOOKAHEAD_DAYS = 14;

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
    // Uma consulta cobre o dia pedido e a janela de busca do próximo dia livre.
    // Repetir a ida ao banco por dia transformaria um card em quinze consultas.
    const zone = rooms[0].config.timeZone;
    const busy = await busyIntervals(
      rooms,
      zonedInstant(day, 0, zone),
      zonedInstant(addIsoDays(day, LOOKAHEAD_DAYS + 1), 0, zone),
    );
    const now = new Date();
    return json(
      {
        day,
        unit: requestedUnit ?? null,
        rooms: rooms.map((room) => {
          const intervals = busy.get(room.id) ?? [];
          const summary = summariseDay(
            day,
            buildDayBlocks({ day, config: room.config, busy: intervals, now }),
            room.config.minimumMinutes,
          );
          return {
            slug: room.slug,
            name: room.name,
            unit: room.locationName,
            ...summary,
            // Só faz sentido dizer "próximo: amanhã às 9h" quando hoje não serve.
            nextDay:
              summary.nextFreeTimes.length > 0
                ? null
                : lookAhead(day, room.config, intervals, now),
          };
        }),
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

function lookAhead(
  from: string,
  config: AvailabilityConfig,
  busy: readonly BusyInterval[],
  now: Date,
) {
  for (let ahead = 1; ahead <= LOOKAHEAD_DAYS; ahead += 1) {
    const day = addIsoDays(from, ahead);
    const summary = summariseDay(
      day,
      buildDayBlocks({ day, config, busy, now }),
      config.minimumMinutes,
    );
    const time = summary.nextFreeTimes[0];
    if (time) return { day, time };
  }
  return null;
}
