/**
 * Gera um evento de calendário (.ics) a partir de uma reserva.
 *
 * Puro de propósito: sem `server-only`, roda no navegador para o botão
 * "Adicionar ao calendário" baixar o arquivo sem ida ao servidor. Datas em UTC
 * (sufixo Z) — o app de calendário converte para o fuso de quem abre.
 */
export type CalendarEvent = {
  uid: string;
  title: string;
  startAtIso: string;
  endAtIso: string;
  location?: string;
  description?: string;
};

function toIcsDate(iso: string): string {
  // 2026-09-10T14:00:00.000Z -> 20260910T140000Z
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Escapa vírgula, ponto e vírgula, barra e quebra de linha, como manda o RFC 5545. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function buildIcs(event: CalendarEvent): string {
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Roomly//Reservas//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}@roomly`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(event.startAtIso)}`,
    `DTEND:${toIcsDate(event.endAtIso)}`,
    `SUMMARY:${escapeText(event.title)}`,
    event.location ? `LOCATION:${escapeText(event.location)}` : null,
    event.description ? `DESCRIPTION:${escapeText(event.description)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((linha): linha is string => linha !== null);
  // O RFC pede CRLF entre as linhas.
  return linhas.join("\r\n");
}
