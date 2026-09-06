/**
 * O endereço público do produto. É daí que sai o link do convite — e um convite
 * com `localhost` chega vivo na caixa de quem foi convidado e não abre em lugar
 * nenhum, sem que ninguém do lado de cá perceba.
 *
 * Sem `server-only`: `/api/ready` e as ações do painel leem daqui.
 */
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

export function appBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/** Serve para o navegador de outra pessoa, não só para esta máquina. */
export function appBaseUrlIsPublic(): boolean {
  return !LOCAL.test(appBaseUrl());
}
