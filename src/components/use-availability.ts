"use client";
import { useEffect, useState } from "react";
import type {
  AvailabilityBlock,
  DaySummary,
} from "@/modules/availability/domain";

export type DayAvailability = {
  day: string;
  timeZone: string;
  openingTime: string;
  closingTime: string;
  slotMinutes: number;
  minimumMinutes: number;
  maximumMinutes: number;
  blocks: AvailabilityBlock[];
  summary: DaySummary;
};

export type MonthAvailability = {
  month: string;
  days: DaySummary[];
};

export type Remote<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

/**
 * Uma requisição por chave, cancelada quando a chave muda. Sem o `AbortController`
 * a resposta de um dia antigo poderia chegar depois e sobrescrever a do dia que
 * a pessoa está olhando.
 */
function useJson<T>(url: string | null): Remote<T> {
  const [state, setState] = useState<Remote<T>>({
    data: null,
    loading: url !== null,
    error: null,
  });
  const [current, setCurrent] = useState(url);

  // Zerar o estado durante o render é o caminho recomendado para reagir a uma
  // entrada nova. Fazer isso num efeito renderiza o dado antigo uma vez antes de
  // limpar — e o preço do dia anterior apareceria por um quadro.
  if (current !== url) {
    setCurrent(url);
    setState({ data: null, loading: url !== null, error: null });
  }

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error ?? "Falha na consulta.");
        return body as T;
      })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          data: null,
          loading: false,
          error:
            cause instanceof Error
              ? cause.message
              : "Não foi possível ler a disponibilidade.",
        });
      });
    return () => controller.abort();
  }, [url]);

  return state;
}

export function useDayAvailability(slug: string, day: string | null) {
  return useJson<DayAvailability>(
    day ? `/api/salas/${slug}/disponibilidade?data=${day}` : null,
  );
}

export type RoomDayAvailability = DaySummary & {
  slug: string;
  name: string;
  unit: string;
  /** Primeiro dia com horário livre, quando o dia pedido não tem nenhum. */
  nextDay: { day: string; time: string } | null;
};

export type CatalogAvailability = {
  day: string;
  unit: string | null;
  rooms: RoomDayAvailability[];
};

export function useCatalogAvailability(day: string, unit: string | null) {
  const query = new URLSearchParams({ data: day });
  if (unit) query.set("unidade", unit);
  return useJson<CatalogAvailability>(`/api/disponibilidade?${query}`);
}

export function useMonthAvailability(slug: string, month: string | null) {
  return useJson<MonthAvailability>(
    month ? `/api/salas/${slug}/calendario?mes=${month}` : null,
  );
}
