/**
 * Disponibilidade é derivada, nunca armazenada: um bloco livre é a ausência de
 * reserva, de limpeza e de passado dentro do expediente. Guardar o estado do
 * bloco criaria uma segunda verdade para divergir das reservas.
 *
 * Este módulo é puro — sem rede, sem `Date.now()` implícito — para que os
 * quatro casos que importam (reservado, limpeza, passado, dia livre) sejam
 * testáveis sem banco.
 */

/** Granularidade da grade. Meia hora cobre reservas de 60, 90 e 120 minutos. */
export const SLOT_MINUTES = 30;

export type BlockState = "available" | "booked" | "cleaning" | "past";

export type AvailabilityBlock = Readonly<{
  /** `HH:MM` no fuso da unidade — é o que o usuário lê. */
  time: string;
  startAt: string;
  endAt: string;
  state: BlockState;
  /** Motivo em pt-BR. Vai para o `aria-label` do bloco (WCAG 1.3.1). */
  reason: string;
  /** Minutos reserváveis a partir daqui. Zero quando o bloco não é início válido. */
  maxDurationMinutes: number;
}>;

export type DayState = "free" | "partial" | "full" | "past" | "closed";

export type DaySummary = Readonly<{
  day: string;
  state: DayState;
  free: number;
  total: number;
  /** Até três horários que aceitam a duração mínima. Vazio quando não há. */
  nextFreeTimes: readonly string[];
  label: string;
}>;

export type BusyInterval = Readonly<{
  startAt: string;
  endAt: string;
  kind: "booked" | "cleaning";
}>;

export type AvailabilityConfig = Readonly<{
  timeZone: string;
  /** `HH:MM`. */
  openingTime: string;
  closingTime: string;
  minimumMinutes: number;
  maximumMinutes: number;
}>;

const pad = (value: number) => String(value).padStart(2, "0");

export function minutesOfDay(time: string) {
  const [hour, minute] = time.split(":");
  return Number(hour) * 60 + Number(minute ?? 0);
}

export function timeLabel(minutes: number) {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/**
 * Deslocamento do fuso no instante dado. `Intl` é a única fonte de regras de
 * fuso disponível sem dependência extra, e continua correta se o Brasil
 * reintroduzir horário de verão.
 */
function zoneOffsetMs(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const field = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return (
    Date.UTC(
      field("year"),
      field("month") - 1,
      field("day"),
      field("hour") % 24,
      field("minute"),
      field("second"),
    ) - instant
  );
}

/** Instante UTC de `HH:MM` de um dia local. */
export function zonedInstant(day: string, minutes: number, timeZone: string) {
  const naive = Date.parse(`${day}T00:00:00Z`) + minutes * 60_000;
  // Duas passagens: a primeira usa o deslocamento no instante errado, a segunda
  // o corrige. Diverge só na hora exata de uma virada de horário de verão.
  const first = naive - zoneOffsetMs(naive, timeZone);
  return new Date(naive - zoneOffsetMs(first, timeZone));
}

const overlaps = (
  start: number,
  end: number,
  interval: { startAt: string; endAt: string },
) =>
  start < Date.parse(interval.endAt) && Date.parse(interval.startAt) < end;

export function buildDayBlocks(input: {
  day: string;
  config: AvailabilityConfig;
  busy: readonly BusyInterval[];
  now: Date;
}): AvailabilityBlock[] {
  const { day, config, busy, now } = input;
  const opening = minutesOfDay(config.openingTime);
  const closing = minutesOfDay(config.closingTime);
  const nowMs = now.getTime();

  const raw: Array<{ minute: number; start: Date; end: Date; state: BlockState }> = [];
  for (let minute = opening; minute + SLOT_MINUTES <= closing; minute += SLOT_MINUTES) {
    const start = zonedInstant(day, minute, config.timeZone);
    const end = zonedInstant(day, minute + SLOT_MINUTES, config.timeZone);
    const startMs = start.getTime();
    const endMs = end.getTime();

    // A ordem importa: um bloco passado continua passado mesmo estando
    // reservado, e não faz sentido dizer "reservado" sobre ontem.
    let state: BlockState = "available";
    if (endMs <= nowMs) state = "past";
    else if (busy.some((i) => i.kind === "booked" && overlaps(startMs, endMs, i)))
      state = "booked";
    else if (busy.some((i) => i.kind === "cleaning" && overlaps(startMs, endMs, i)))
      state = "cleaning";

    raw.push({ minute, start, end, state });
  }

  return raw.map((block, index) => {
    let runMinutes = 0;
    for (let next = index; next < raw.length; next += 1) {
      if (raw[next].state !== "available") break;
      runMinutes += SLOT_MINUTES;
      if (runMinutes >= config.maximumMinutes) break;
    }
    const maxDurationMinutes =
      block.state === "available" ? Math.min(runMinutes, config.maximumMinutes) : 0;
    return {
      time: timeLabel(block.minute),
      startAt: block.start.toISOString(),
      endAt: block.end.toISOString(),
      state: block.state,
      reason: reasonFor(block.state, maxDurationMinutes, config.minimumMinutes),
      maxDurationMinutes,
    };
  });
}

function reasonFor(state: BlockState, maxDuration: number, minimum: number) {
  if (state === "past") return "Horário já passou";
  if (state === "booked") return "Reservado";
  if (state === "cleaning") return "Limpeza entre reservas";
  if (maxDuration < minimum)
    return `Livre por apenas ${maxDuration} min; a reserva mínima é de ${minimum} min`;
  return "Livre";
}

export function summariseDay(
  day: string,
  blocks: readonly AvailabilityBlock[],
  minimumMinutes: number,
): DaySummary {
  const bookable = blocks.filter(
    (block) =>
      block.state === "available" && block.maxDurationMinutes >= minimumMinutes,
  );
  const free = bookable.length;
  const total = blocks.length;
  // "Livre" é a ausência de ocupação, não `free === total`: o último bloco do
  // dia quase nunca comporta a duração mínima, e um dia intocado seria rotulado
  // de parcial por causa dele.
  const state: DayState =
    total === 0
      ? "closed"
      : blocks.every((block) => block.state === "past")
        ? "past"
        : blocks.every((block) => block.state === "available")
          ? "free"
          : free === 0
            ? "full"
            : "partial";
  return {
    day,
    state,
    free,
    total,
    // Três bastam para o card responder "posso usar hoje?"; a lista inteira
    // está na página da sala.
    nextFreeTimes: bookable.slice(0, 3).map((block) => block.time),
    label: dayLabel(state, free),
  };
}

function dayLabel(state: DayState, free: number) {
  if (state === "closed") return "Fechado";
  if (state === "past") return "Data passada";
  if (state === "full") return "Lotado";
  return free === 1 ? "1 livre" : `${free} livres`;
}

/** Dias de um mês `YYYY-MM`, no formato `YYYY-MM-DD`. */
export function daysOfMonth(month: string): string[] {
  const [year, index] = month.split("-").map(Number);
  const total = new Date(Date.UTC(year, index, 0)).getUTCDate();
  return Array.from(
    { length: total },
    (_, offset) => `${month}-${pad(offset + 1)}`,
  );
}
