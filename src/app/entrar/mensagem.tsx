"use client";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

/**
 * O que dizer no topo do formulário — e por que isso depende do navegador.
 *
 * Um dos formatos de confirmação do Supabase devolve a sessão no fragmento da
 * URL (`#access_token=…`), que o navegador nunca envia ao servidor. Do lado de
 * lá, a rota de confirmação não tem como distinguir esse caso de um link
 * quebrado, e manda todo mundo para cá com o mesmo aviso.
 *
 * Aqui o fragmento é legível. Quando ele traz uma confirmação, o endereço já
 * foi confirmado do lado do Supabase e a pessoa só precisa entrar — dizer
 * "este link não vale mais" seria mentira, e mentira que faz desistir.
 *
 * O fragmento é lido por `useSyncExternalStore`, e não em efeito: o servidor
 * não tem `window`, e é essa função que deixa a primeira pintura do cliente
 * combinar com a do servidor em vez de corrigir a tela depois de hidratar.
 */
export function MensagemDeEntrada({ erro }: { erro?: string }) {
  // A leitura é guardada na primeira vez. Sem isso, apagar o fragmento logo
  // abaixo faria a próxima renderização concluir que não havia confirmação
  // nenhuma, e a mensagem sumiria sozinha.
  const lido = useRef<boolean | null>(null);
  const assinar = useCallback(() => () => {}, []);
  const ler = useCallback(() => {
    if (lido.current === null) {
      const dados = new URLSearchParams(window.location.hash.slice(1));
      lido.current =
        dados.has("access_token") || dados.get("type") === "signup";
    }
    return lido.current;
  }, []);
  const confirmado = useSyncExternalStore(assinar, ler, () => false);

  useEffect(() => {
    if (!confirmado || !window.location.hash) return;
    // Tira os tokens da barra de endereço. Eles não servem para mais nada nesta
    // tela e não têm por que sobrar no histórico ou num print.
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  }, [confirmado]);

  if (confirmado)
    return (
      <p
        role="status"
        className="rounded-md border border-border-subtle bg-surface-page p-3 text-subheadline leading-6 text-text-secondary"
      >
        E-mail confirmado. Entre com seu e-mail e senha para continuar.
      </p>
    );

  if (!erro) return null;

  return (
    <p role="alert" className="text-subheadline font-semibold text-danger-text">
      {erro === "confirmacao-invalida"
        ? "Não foi possível usar este link de confirmação. Se você já confirmou, entre com seu e-mail e senha."
        : "E-mail ou senha inválidos."}
    </p>
  );
}
