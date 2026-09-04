import { describe, expect, it } from "vitest";
import { createBookingSchema } from "@/modules/reservations/schemas";
import {
  addIsoDays,
  formatIsoDay,
  formatIsoWeekday,
  isoDay,
  nextBookableDay,
} from "./utils";

describe("dias reserváveis", () => {
  it("avança o dia respeitando virada de mês e ano", () => {
    expect(addIsoDays("2026-09-03", 1)).toBe("2026-09-04");
    expect(addIsoDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addIsoDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("usa o fuso da operação para o dia corrente", () => {
    // 03:00Z de 04/09 ainda é 03/09 em São Paulo (UTC-3).
    expect(isoDay(new Date("2026-09-04T02:59:00Z"))).toBe("2026-09-03");
    expect(isoDay(new Date("2026-09-04T03:01:00Z"))).toBe("2026-09-04");
  });

  it("mantém o padrão do formulário no futuro para o schema de reserva", () => {
    const day = nextBookableDay(isoDay());
    const start = new Date(`${day}T14:00:00-03:00`);
    const parsed = createBookingSchema.safeParse({
      roomId: "30000000-0000-4000-8000-000000000001",
      startAt: start.toISOString(),
      endAt: new Date(start.getTime() + 60 * 60_000).toISOString(),
      paymentMethod: "pix",
      idempotencyKey: "0192b9ce-1f7a-7c3d-9f2b-6f0a1c2d3e4f",
    });
    expect(parsed.success).toBe(true);
  });

  it("formata dia e dia da semana sem deslocar o fuso", () => {
    expect(formatIsoDay("2026-09-03")).toBe("03/09/2026");
    expect(formatIsoWeekday("2026-09-03")).toBe("quinta-feira");
  });
});
