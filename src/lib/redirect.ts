/**
 * Para onde levar a pessoa depois que ela entra ou cria a conta.
 *
 * O destino viaja na URL, então quem monta o link escolhe o valor — e isso
 * inclui quem manda o link por e-mail. Aceitar qualquer coisa transformaria
 * `/entrar` num trampolim: `?redirecionar=https://sitefalso` devolveria a
 * pessoa para fora do Roomly no instante seguinte ao de ela digitar a senha,
 * que é o roteiro de um phishing convincente, porque a tela onde ela digitou
 * era mesmo a nossa.
 *
 * Por isso só passa caminho do próprio site, e nada que o navegador possa ler
 * como outro host.
 */
export const DEFAULT_DESTINATION = "/minhas-reservas";

export function internalPath(
  value: unknown,
  fallback: string = DEFAULT_DESTINATION,
): string {
  if (typeof value !== "string") return fallback;
  const candidate = value.trim();
  if (!candidate.startsWith("/")) return fallback;
  // `//host` e `/\host` são relativos ao protocolo: o navegador troca de
  // domínio sem que apareça um `https:` no valor.
  if (/^\/[/\\]/.test(candidate)) return fallback;
  // Caractere de controle no meio de um cabeçalho `Location` é a receita
  // clássica de partir a resposta em duas.
  if (/[\u0000-\u001f\u007f]/.test(candidate)) return fallback;
  return candidate;
}

/** Link de entrada que volta para onde a pessoa estava. */
export function signInHref(destination: string) {
  return `/entrar?redirecionar=${encodeURIComponent(destination)}`;
}

/** Link de cadastro que volta para onde a pessoa estava. */
export function signUpHref(destination: string) {
  return `/cadastro?redirecionar=${encodeURIComponent(destination)}`;
}
