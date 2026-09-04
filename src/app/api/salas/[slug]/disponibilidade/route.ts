import {
  buildDayBlocks,
  summariseDay,
  zonedInstant,
  SLOT_MINUTES,
} from "@/modules/availability/domain";
import { daySchema } from "@/modules/availability/schemas";
import { availabilityRoomBySlug, busyIntervals } from "@/lib/server/availability";
import { clientAddress, json, rateLimit, requestId } from "@/lib/server/http";
import { logEvent } from "@/lib/server/logger";
import { isoDay } from "@/lib/utils";

/** Leitura pública: o catálogo mostra disponibilidade antes de qualquer login. */
export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const id = requestId(request);
  if (!rateLimit(`availability:${clientAddress(request)}`, 120)) {
    return json({ error: "Muitas consultas. Aguarde um minuto." }, 429, id);
  }
  const { slug } = await context.params;
  const parsed = daySchema.safeParse(
    new URL(request.url).searchParams.get("data") ?? isoDay(),
  );
  if (!parsed.success) {
    return json(
      { error: parsed.error.issues[0]?.message ?? "Data inválida." },
      422,
      id,
    );
  }
  try {
    const room = await availabilityRoomBySlug(slug);
    if (!room) return json({ error: "Sala não encontrada." }, 404, id);

    const day = parsed.data;
    const { timeZone, minimumMinutes } = room.config;
    const busy = await busyIntervals(
      [room],
      zonedInstant(day, 0, timeZone),
      zonedInstant(day, 24 * 60, timeZone),
    );
    const blocks = buildDayBlocks({
      day,
      config: room.config,
      busy: busy.get(room.id) ?? [],
      now: new Date(),
    });
    return json(
      {
        room: { slug: room.slug, name: room.name, unit: room.locationName },
        day,
        timeZone,
        openingTime: room.config.openingTime,
        closingTime: room.config.closingTime,
        slotMinutes: SLOT_MINUTES,
        minimumMinutes,
        maximumMinutes: room.config.maximumMinutes,
        blocks,
        summary: summariseDay(day, blocks, minimumMinutes),
      },
      200,
      id,
    );
  } catch (error) {
    logEvent("error", "availability.day_failed", {
      requestId: id,
      slug,
      error: error instanceof Error ? error.message : "unknown",
    });
    return json({ error: "Não foi possível ler a disponibilidade." }, 503, id);
  }
}
