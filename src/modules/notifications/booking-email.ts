import { BOOKING_TIME_ZONE, capitalizeFirst, formatMoney } from "@/lib/utils";

export type BookingEmailData = Readonly<{
  customerName: string;
  roomName: string;
  unitName: string | null;
  address: string | null;
  startAt: string;
  endAt: string;
  totalCents: number;
  /** Link para a ficha da reserva. Ausente quando não há endereço público. */
  bookingUrl: string | null;
  accessNote: string | null;
}>;

export type RenderedEmail = Readonly<{
  subject: string;
  text: string;
  html: string;
}>;

/**
 * Função pura: recebe a reserva, devolve o e-mail. Montar o texto dentro do
 * worker misturava a decisão de *o que dizer* com a de *quando enviar*, e a
 * primeira é a única que dá para testar sem banco.
 *
 * Sai texto e HTML. Cliente de e-mail que não renderiza HTML — ou quem desliga
 * imagens e estilos — continua recebendo a reserva inteira, não um "veja no
 * navegador".
 */
export function renderBookingConfirmed(data: BookingEmailData): RenderedEmail {
  const day = capitalizeFirst(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: BOOKING_TIME_ZONE,
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(data.startAt)),
  );
  const window = `${clock(data.startAt)} às ${clock(data.endAt)}`;
  const local = [data.unitName, data.address].filter(Boolean).join(" · ");
  const firstName = data.customerName.trim().split(/\s+/)[0] || "Olá";

  const facts: Array<[string, string]> = [
    ["Sala", data.roomName],
    ...(local ? ([["Local", local]] as Array<[string, string]>) : []),
    ["Data", day],
    ["Horário", window],
    ["Total", formatMoney(data.totalCents)],
  ];

  const subject = `Reserva confirmada · ${data.roomName}, ${shortDay(data.startAt)} às ${clock(data.startAt)}`;

  const text = [
    `${firstName}, sua reserva está confirmada.`,
    "",
    ...facts.map(([label, value]) => `${label}: ${value}`),
    "",
    data.accessNote ?? "",
    data.bookingUrl ? `Detalhes da reserva: ${data.bookingUrl}` : "",
    "",
    "Precisa cancelar ou remarcar? Responda este e-mail.",
    "",
    "Roomly",
  ]
    .filter((line, index, all) => !(line === "" && all[index - 1] === ""))
    .join("\n")
    .trim();

  return { subject, text, html: renderHtml({ firstName, facts, data }) };
}

const clock = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: BOOKING_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));

const shortDay = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: BOOKING_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso));

/** `&` primeiro, senão as entidades geradas depois seriam escapadas de novo. */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Tabelas e estilo em linha porque cliente de e-mail ignora `<style>` e grade
 * moderna. As cores são as da marca, escritas literalmente: variável CSS não
 * chega ao Gmail.
 */
function renderHtml({
  firstName,
  facts,
  data,
}: {
  firstName: string;
  facts: Array<[string, string]>;
  data: BookingEmailData;
}) {
  const rows = facts
    .map(
      ([label, value]) => `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #E6E9F0;color:#5B6478;font-size:14px;width:96px;vertical-align:top;">${escapeHtml(label)}</td>
            <td style="padding:10px 0;border-bottom:1px solid #E6E9F0;color:#172243;font-size:15px;font-weight:600;">${escapeHtml(value)}</td>
          </tr>`,
    )
    .join("");

  const button = data.bookingUrl
    ? `
        <tr><td style="padding-top:28px;">
          <a href="${escapeHtml(data.bookingUrl)}" style="display:inline-block;background:#FB5131;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:8px;">Ver minha reserva</a>
        </td></tr>`
    : "";

  const access = data.accessNote
    ? `
        <tr><td style="padding-top:24px;color:#5B6478;font-size:14px;line-height:22px;">${escapeHtml(data.accessNote)}</td></tr>`
    : "";

  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:0;background:#F4F6FB;">
  <div style="display:none;max-height:0;overflow:hidden;">Sua reserva de ${escapeHtml(data.roomName)} está confirmada.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FB;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;padding:36px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="color:#FB5131;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Roomly</td></tr>
        <tr><td style="padding-top:14px;color:#172243;font-size:26px;font-weight:700;line-height:32px;">Reserva confirmada</td></tr>
        <tr><td style="padding-top:10px;color:#5B6478;font-size:15px;line-height:23px;">${escapeHtml(firstName)}, está tudo certo. Guarde este e-mail — ele tem os detalhes do seu horário.</td></tr>
        <tr><td style="padding-top:26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
          </table>
        </td></tr>${access}${button}
        <tr><td style="padding-top:30px;border-top:1px solid #E6E9F0;margin-top:12px;color:#8A93A6;font-size:13px;line-height:21px;">
          Precisa cancelar ou remarcar? Basta responder a este e-mail.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
