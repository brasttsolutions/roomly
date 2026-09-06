import type { CookieOptions } from "@supabase/ssr";

/**
 * Endurece o cookie de sessão antes de escrevê-lo.
 *
 * O padrão do `@supabase/ssr` deixa o cookie legível por JavaScript, porque o
 * cliente de navegador dele precisa ler. Este projeto não usa cliente de
 * navegador: quem fala com o Supabase é sempre o servidor. Sem `httpOnly`, um
 * único XSS entrega a sessão inteira de quem está logado.
 *
 * `secure` também não vinha marcado. Atrás do proxy do host o app recebe HTTP,
 * então nada deduz o contrário sozinho, e uma visita a `http://` mandaria a
 * sessão em texto claro antes do redirecionamento para HTTPS.
 */
export function hardenedCookie(options: CookieOptions = {}): CookieOptions {
  if (process.env.NODE_ENV !== "production") return options;
  return { ...options, httpOnly: true, secure: true };
}
