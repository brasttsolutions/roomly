import { describe, expect, it } from "vitest";
import {
  buildDayBlocks,
  daysOfMonth,
  summariseDay,
  timeLabel,
  zonedInstant,
  type AvailabilityConfig,
  type BusyInterval,
} from "./domain";

const config: AvailabilityConfig = {
  timeZone: "America/Sao_Paulo",
  openingTime: "08:00",
  closingTime: "18:00",
  minimumMinutes: 60,
  maximumMinutes: 240,
};
const DAY = "2026-09-10";
/** Véspera: nenhum bloco do dia analisado é passado. */
const BEFORE = new Date("2026-09-09T12:00:00-03:00");

const at = (time: string) => zonedInstant(DAY, minutes(time), "America/Sao_Paulo");
const minutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const block = (blocks: ReturnType<typeof buildDayBlocks>, time: string) => {
  const found = blocks.find((item) => item.time === time);
  if (!found) throw new Error(`bloco ${time} não existe`);
  return found;
};
const booking = (start: string, end: string): BusyInterval[] => [
  { startAt: at(start).toISOString(), endAt: at(end).toISOString(), kind: "booked" },
  {
    startAt: at(end).toISOString(),
    endAt: new Date(at(end).getTime() + 20 * 60_000).toISOString(),
    kind: "cleaning",
  },
];

describe("fuso da unidade", () => {
  it("converte a hora local para o instante correto", () => {
    expect(zonedInstant(DAY, minutes("08:00"), "America/Sao_Paulo").toISOString())
      .toBe("2026-09-10T11:00:00.000Z");
  });

  it("respeita um fuso diferente do de São Paulo", () => {
    expect(zonedInstant(DAY, minutes("08:00"), "America/Manaus").toISOString())
      .toBe("2026-09-10T12:00:00.000Z");
  });

  it("formata minutos como HH:MM", () => {
    expect(timeLabel(510)).toBe("08:30");
  });
});

describe("dia inteiro livre", () => {
  const blocks = buildDayBlocks({ day: DAY, config, busy: [], now: BEFORE });

  it("gera um bloco a cada meia hora dentro do expediente", () => {
    expect(blocks).toHaveLength(20);
    expect(blocks[0].time).toBe("08:00");
    expect(blocks.at(-1)?.time).toBe("17:30");
  });

  it("marca todos como disponíveis", () => {
    expect(blocks.every((item) => item.state === "available")).toBe(true);
  });

  it("resume o dia como livre", () => {
    const summary = summariseDay(DAY, blocks, config.minimumMinutes);
    expect(summary.state).toBe("free");
    expect(summary.nextFree).toBe("08:00");
    expect(summary.label).toBe("19 livres");
  });

  it("limita a duração pelo máximo da sala, não pelo fim do expediente", () => {
    expect(block(blocks, "08:00").maxDurationMinutes).toBe(240);
  });

  it("encurta a duração perto do fechamento", () => {
    expect(block(blocks, "17:30").maxDurationMinutes).toBe(30);
  });

  it("explica por que um bloco livre curto demais não serve", () => {
    expect(block(blocks, "17:30").reason).toBe(
      "Livre por apenas 30 min; a reserva mínima é de 60 min",
    );
  });
});

describe("bloco reservado", () => {
  const blocks = buildDayBlocks({
    day: DAY,
    config,
    busy: booking("14:00", "15:00"),
    now: BEFORE,
  });

  it("marca os dois blocos da reserva", () => {
    expect(block(blocks, "14:00").state).toBe("booked");
    expect(block(blocks, "14:30").state).toBe("booked");
  });

  it("devolve o motivo junto do estado", () => {
    expect(block(blocks, "14:00").reason).toBe("Reservado");
  });

  it("não deixa reservar duração que atravessa o bloco ocupado", () => {
    // 12:00 tem duas horas até as 14:00 — e nem um minuto a mais.
    expect(block(blocks, "12:00").maxDurationMinutes).toBe(120);
  });

  it("zera a duração do próprio bloco ocupado", () => {
    expect(block(blocks, "14:00").maxDurationMinutes).toBe(0);
  });

  it("resume o dia como parcial", () => {
    expect(summariseDay(DAY, blocks, config.minimumMinutes).state).toBe(
      "partial",
    );
  });
});

describe("bloco em limpeza", () => {
  const blocks = buildDayBlocks({
    day: DAY,
    config,
    busy: booking("14:00", "15:00"),
    now: BEFORE,
  });

  it("bloqueia a janela seguinte à reserva", () => {
    expect(block(blocks, "15:00").state).toBe("cleaning");
    expect(block(blocks, "15:00").reason).toBe("Limpeza entre reservas");
  });

  it("libera o bloco seguinte ao fim da limpeza", () => {
    expect(block(blocks, "15:30").state).toBe("available");
  });
});

describe("bloco passado", () => {
  const blocks = buildDayBlocks({
    day: DAY,
    config,
    busy: booking("09:00", "10:00"),
    now: new Date("2026-09-10T13:00:00-03:00"),
  });

  it("marca como passado o que já terminou", () => {
    expect(block(blocks, "12:30").state).toBe("past");
    expect(block(blocks, "12:30").reason).toBe("Horário já passou");
  });

  it("mantém disponível o bloco em curso", () => {
    expect(block(blocks, "13:00").state).toBe("available");
  });

  it("prefere passado a reservado no que já aconteceu", () => {
    // Dizer "reservado" sobre as 9h de um dia que já passou das 13h não ajuda.
    expect(block(blocks, "09:00").state).toBe("past");
  });

  it("resume um dia inteiramente vencido como passado", () => {
    const vencido = buildDayBlocks({
      day: DAY,
      config,
      busy: [],
      now: new Date("2026-09-11T09:00:00-03:00"),
    });
    const summary = summariseDay(DAY, vencido, config.minimumMinutes);
    expect(summary.state).toBe("past");
    expect(summary.label).toBe("Data passada");
    expect(summary.nextFree).toBeNull();
  });
});

describe("dia lotado", () => {
  it("resume como lotado quando nada comporta a duração mínima", () => {
    const blocks = buildDayBlocks({
      day: DAY,
      config,
      busy: [
        {
          startAt: at("08:00").toISOString(),
          endAt: at("18:00").toISOString(),
          kind: "booked",
        },
      ],
      now: BEFORE,
    });
    const summary = summariseDay(DAY, blocks, config.minimumMinutes);
    expect(summary.state).toBe("full");
    expect(summary.label).toBe("Lotado");
  });
});

describe("dias do mês", () => {
  it("conta os dias de fevereiro bissexto", () => {
    expect(daysOfMonth("2028-02")).toHaveLength(29);
  });

  it("começa no dia 01 e termina no último", () => {
    const days = daysOfMonth("2026-09");
    expect(days[0]).toBe("2026-09-01");
    expect(days.at(-1)).toBe("2026-09-30");
  });
});
