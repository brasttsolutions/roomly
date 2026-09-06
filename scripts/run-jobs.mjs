// Puxa a fila uma vez. É isto que o agendador do host chama a cada minuto.
//
// Sem alguém chamando, a reserva confirma no banco e para aí: nenhum código de
// porta é criado, nenhum e-mail sai, nenhum hold expira e nenhum reembolso é
// pedido. As sondas continuam verdes, e o primeiro sinal é o cliente parado na
// porta.
//
// Sai com código 1 quando a chamada falha, para o agendador registrar a falha
// em vez de engolir.

const base = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "")
  .trim()
  .replace(/\/+$/, "");
const secret = process.env.CRON_SECRET;

if (!base) {
  console.error("APP_URL (ou NEXT_PUBLIC_APP_URL) é obrigatório.");
  process.exitCode = 1;
} else if (!secret) {
  console.error("CRON_SECRET é obrigatório.");
  process.exitCode = 1;
} else {
  try {
    const resposta = await fetch(`${base}/api/internal/jobs/run`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(60_000),
    });
    const corpo = await resposta.text();
    console.log(`${resposta.status} ${corpo.slice(0, 500)}`);
    if (!resposta.ok) process.exitCode = 1;
  } catch (causa) {
    console.error(
      `falha ao chamar a fila: ${causa instanceof Error ? causa.message : "desconhecida"}`,
    );
    process.exitCode = 1;
  }
}
