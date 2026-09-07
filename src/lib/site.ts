/**
 * Dados institucionais do Roomly, num lugar só.
 *
 * Razão social e CNPJ aparecem no rodapé e no aviso de privacidade, e um
 * documento legal com identificação divergente entre páginas é pior do que não
 * ter documento. Por isso os dois leem daqui.
 */
export const site = {
  legalName: "68.790.675 Arthur Schmitt de Freitas",
  document: "68.790.675/0001-15",
  contactEmail: "contato@brastt.com.br",
  /** Data da última revisão do aviso de privacidade e da página de cookies. */
  policyUpdatedAt: "2026-09-06",
} as const;

/**
 * Perfis sociais. O rodapé só desenha o que estiver preenchido: um ícone que
 * leva a lugar nenhum passa exatamente a impressão contrária da que ele existe
 * para passar.
 */
export const socials: ReadonlyArray<{
  name: string;
  href: string;
}> = [
  { name: "Instagram", href: "https://www.instagram.com/brastt.solutions/" },
  // LinkedIn em criação. Fica aqui vazio de propósito: no dia em que existir,
  // basta colar o endereço e ele aparece.
  { name: "LinkedIn", href: "" },
].filter((perfil) => perfil.href.trim().length > 0);
