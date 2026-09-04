import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { BookingRecord } from "@/modules/reservations/application";
import { GET as dayRoute } from "@/app/api/salas/[slug]/disponibilidade/route";
import { GET as monthRoute } from "@/app/api/salas/[slug]/calendario/route";
import { GET as catalogRoute } from "@/app/api/disponibilidade/route";
import { rooms } from "@/lib/demo-data";
import { zonedInstant } from "./domain";

/**
 * Teste de integração dos três endpoints em modo simulador: entra pela rota,
 * passa pelo repositório de reservas e volta como JSON. O banco fica de fora,
 * mas o caminho que a interface vai usar é exercido inteiro.
 */
const ROOM = rooms[0];
const DAY = "2026-09-10";
const NEXT_DAY = "2026-09-11";
const ZONE = "America/Sao_Paulo";
const NOW = new Date("2026-09-10T13:00:00-03:00");

const at = (day: string, time: string) =>
  zonedInstant(
    day,
    Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)),
    ZONE,
  ).toISOString();

const params = (slug: string) => ({ params: Promise.resolve({ slug }) });
const get = (path: string) => new Request(`http://localhost${path}`);

type Block = { time: string; state: string; reason: string };
type DayBody = { blocks: Block[]; summary: { state: string; free: number } };
const blockAt = (body: DayBody, time: string) => {
  const found = body.blocks.find((item) => item.time === time);
  if (!found) throw new Error(`bloco ${time} ausente na resposta`);
  return found;
};

const store = globalThis as typeof globalThis & {
  roomlyBookings?: Map<string, BookingRecord>;
};

beforeAll(() => {
  // O repositório do simulador guarda as reservas neste mapa global; escrever
  // nele é o equivalente a ter uma reserva no banco.
  const bookings = (store.roomlyBookings ??= new Map());
  bookings.set("teste-disponibilidade", {
    id: "booking_teste",
    companyId: "10000000-0000-4000-8000-000000000001",
    userId: "40000000-0000-4000-8000-000000000001",
    roomId: ROOM.id,
    startAt: at(DAY, "15:00"),
    endAt: at(DAY, "16:00"),
    status: "awaiting_payment",
    amountCents: 12000,
  });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterAll(() => {
  vi.useRealTimers();
  store.roomlyBookings?.delete("teste-disponibilidade");
});

describe("GET /api/salas/[slug]/disponibilidade", () => {
  it("reflete a reserva existente, a limpeza e o passado", async () => {
    const response = await dayRoute(
      get(`/api/salas/${ROOM.slug}/disponibilidade?data=${DAY}`),
      params(ROOM.slug),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as DayBody;

    expect(blockAt(body, "15:00").state).toBe("booked");
    expect(blockAt(body, "15:00").reason).toBe("Reservado");
    expect(blockAt(body, "16:00").state).toBe("cleaning");
    expect(blockAt(body, "16:30").state).toBe("available");
    expect(blockAt(body, "09:00").state).toBe("past");
    expect(body.summary.state).toBe("partial");
  });

  it("devolve o dia seguinte inteiramente livre", async () => {
    const response = await dayRoute(
      get(`/api/salas/${ROOM.slug}/disponibilidade?data=${NEXT_DAY}`),
      params(ROOM.slug),
    );
    const body = (await response.json()) as DayBody;
    expect(body.summary.state).toBe("free");
    expect(body.blocks.every((item) => item.state === "available")).toBe(true);
  });

  it("não vaza a ocupação de uma sala para outra", async () => {
    const other = rooms[1];
    const response = await dayRoute(
      get(`/api/salas/${other.slug}/disponibilidade?data=${DAY}`),
      params(other.slug),
    );
    const body = (await response.json()) as DayBody;
    expect(blockAt(body, "15:00").state).toBe("available");
  });

  it("recusa data inexistente com 422 e mensagem", async () => {
    const response = await dayRoute(
      get(`/api/salas/${ROOM.slug}/disponibilidade?data=2026-02-31`),
      params(ROOM.slug),
    );
    expect(response.status).toBe(422);
    expect((await response.json()).error).toBe("Esta data não existe.");
  });

  it("responde 404 para sala desconhecida", async () => {
    const response = await dayRoute(
      get("/api/salas/sala-fantasma/disponibilidade"),
      params("sala-fantasma"),
    );
    expect(response.status).toBe(404);
  });
});

describe("GET /api/salas/[slug]/calendario", () => {
  it("resume cada dia do mês", async () => {
    const response = await monthRoute(
      get(`/api/salas/${ROOM.slug}/calendario?mes=2026-09`),
      params(ROOM.slug),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      days: Array<{ day: string; state: string; label: string }>;
    };
    expect(body.days).toHaveLength(30);
    expect(body.days.find((d) => d.day === "2026-09-01")?.state).toBe("past");
    expect(body.days.find((d) => d.day === DAY)?.state).toBe("partial");
    expect(body.days.find((d) => d.day === NEXT_DAY)?.state).toBe("free");
  });

  it("recusa mês inválido", async () => {
    const response = await monthRoute(
      get(`/api/salas/${ROOM.slug}/calendario?mes=2026-13`),
      params(ROOM.slug),
    );
    expect(response.status).toBe(422);
  });
});

describe("GET /api/disponibilidade", () => {
  it("resume todas as salas do dia", async () => {
    const response = await catalogRoute(get(`/api/disponibilidade?data=${DAY}`));
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      rooms: Array<{ slug: string; state: string; nextFree: string | null }>;
    };
    expect(body.rooms).toHaveLength(rooms.length);
    expect(body.rooms.find((r) => r.slug === ROOM.slug)?.state).toBe("partial");
  });

  it("filtra pela unidade", async () => {
    const response = await catalogRoute(
      get(
        `/api/disponibilidade?data=${DAY}&unidade=${encodeURIComponent(ROOM.location)}`,
      ),
    );
    const body = (await response.json()) as { rooms: Array<{ unit: string }> };
    expect(body.rooms.length).toBeGreaterThan(0);
    expect(body.rooms.every((r) => r.unit === ROOM.location)).toBe(true);
  });

  it("devolve lista vazia para unidade inexistente", async () => {
    const response = await catalogRoute(
      get(`/api/disponibilidade?data=${DAY}&unidade=Unidade%20Fantasma`),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).rooms).toEqual([]);
  });
});
