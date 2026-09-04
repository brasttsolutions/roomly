import {
  buildDayBlocks,
  daysOfMonth,
  summariseDay,
  zonedInstant,
} from "@/modules/availability/domain";
import { monthSchema } from "@/modules/availability/schemas";
import { availabilityRoomBySlug, busyIntervals } from "@/lib/server/availability";
import { clientAddress, json, rateLimit, requestId } from "@/lib/server/http";
import { logEvent } from "@/lib/server/logger";
import { isoDay } from "@/lib/utils";

/** Densidade por dia, para o calendário escolher a data já sabendo o que há. */
export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const id = requestId(request);
  if (!rateLimit(`availability:${clientAddress(request)}`, 120)) {
    return json({ error: "Muitas consultas. Aguarde um minuto." }, 429, id);
  }
  const { slug } = await context.params;
  const parsed = monthSchema.safeParse(
    new URL(request.url).searchParams.get("mes") ?? isoDay().slice(0, 7),
  );
  if (!parsed.success) {
    return json(
      { error: parsed.error.issues[0]?.message ?? "Mês inválido." },
      422,
      id,
    );
  }
  try {
    const room = await availabilityRoomBySlug(slug);
    if (!room) return json({ error: "Sala não encontrada." }, 404, id);

    const month = parsed.data;
    const days = daysOfMonth(month);
    const { timeZone, minimumMinutes } = room.config;
    // Uma consulta cobre o mês inteiro; particionar por dia faria trinta idas
    // ao banco para responder uma tela só.
    const busy = await busyIntervals(
      [room],
      zonedInstant(days[0], 0, timeZone),
      zonedInstant(days[days.length - 1], 24 * 60, timeZone),
    );
    const intervals = busy.get(room.id) ?? [];
    const now = new Date();
    return json(
      {
        room: { slug: room.slug, name: room.name, unit: room.locationName },
        month,
        timeZone,
        days: days.map((day) =>
          summariseDay(
            day,
            buildDayBlocks({ day, config: room.config, busy: intervals, now }),
            minimumMinutes,
          ),
        ),
      },
      200,
      id,
    );
  } catch (error) {
    logEvent("error", "availability.month_failed", {
      requestId: id,
      slug,
      error: error instanceof Error ? error.message : "unknown",
    });
    return json({ error: "Não foi possível ler o calendário." }, 503, id);
  }
}
