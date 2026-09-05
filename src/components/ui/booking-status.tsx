import { Badge, type BadgeTone } from "./badge";

/**
 * A tradução de status de reserva para rótulo e tom, num lugar só. Antes ela
 * estava duplicada entre o painel e a ficha da reserva, com tons diferentes
 * para o mesmo estado: "Confirmada" saía azul num lugar e verde no outro.
 *
 * "Em revisão" é visível de propósito: é o estado que a maioria dos produtos
 * esconde, e quem pagou precisa saber que há uma conferência em andamento.
 */
const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  awaiting_payment: { label: "Aguardando pagamento", tone: "warning" },
  confirmed: { label: "Confirmada", tone: "success" },
  in_progress: { label: "Em andamento", tone: "info" },
  completed: { label: "Concluída", tone: "neutral" },
  cancelled: { label: "Cancelada", tone: "neutral" },
  expired: { label: "Expirada", tone: "danger" },
  refunded: { label: "Reembolsada", tone: "info" },
  manual_review: { label: "Em revisão", tone: "warning" },
};

export type BookingStatusValue = keyof typeof STATUS;

export function bookingStatus(value: string) {
  return STATUS[value] ?? { label: value, tone: "neutral" as BadgeTone };
}

export function BookingStatus({ value }: { value: string }) {
  const status = bookingStatus(value);
  return <Badge tone={status.tone}>{status.label}</Badge>;
}
