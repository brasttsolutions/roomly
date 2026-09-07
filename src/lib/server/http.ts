import "server-only";
import { randomUUID } from "node:crypto";

export function requestId(request: Request) {
  return (
    request.headers.get("x-request-id")?.slice(0, 100) ??
    `req_${randomUUID().replaceAll("-", "").slice(0, 16)}`
  );
}
export function json(data: unknown, status: number, id: string) {
  return Response.json(data, {
    status,
    headers: { "x-request-id": id, "cache-control": "no-store" },
  });
}
export function clientAddress(request: Request) {
  // `X-Forwarded-For` é uma lista `cliente, proxy1, proxy2`, onde cada salto
  // ACRESCENTA à direita o endereço que enxergou. O elemento mais à esquerda é
  // escolhido por quem chama — usá-lo deixava o rate limit inútil: bastava
  // trocar o valor a cada requisição para zerar o contador. O último elemento é
  // o que a nossa borda confiável (o proxy do Railway) acrescentou, o peer real,
  // fora do alcance do cliente. É ele que vira a chave.
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return "local";
  const hops = forwarded
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  return hops.at(-1) ?? "local";
}

// Teto do mapa: um atacante que forja endereços cria uma entrada por valor. Sem
// limite, isso é um vetor de pressão de memória. Ao estourar o teto, as entradas
// já expiradas são podadas; se ainda assim não couber, o registro mais antigo
// sai. É best-effort de propósito — a defesa real é a chave não ser forjável.
const windows = new Map<string, { count: number; resetAt: number }>();
const MAX_WINDOWS = 10_000;

function prune(now: number) {
  for (const [key, entry] of windows)
    if (entry.resetAt <= now) windows.delete(key);
  if (windows.size > MAX_WINDOWS) {
    const excedente = windows.size - MAX_WINDOWS;
    let i = 0;
    for (const key of windows.keys()) {
      if (i++ >= excedente) break;
      windows.delete(key);
    }
  }
}

export function rateLimit(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    if (windows.size >= MAX_WINDOWS) prune(now);
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
