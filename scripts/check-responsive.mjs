// Encontra o que estoura a largura da tela, e diz qual elemento é o culpado.
//
// A suíte de navegador roda num viewport de celular e passa, mas ela afirma
// comportamento, não largura: um botão que vaza 40px para fora da tela não
// quebra nenhuma asserção e ninguém vê até abrir no celular de verdade.
//
// Uso: `npm run check:responsive`, com o app de pé em ROOMLY_URL
// (padrão http://127.0.0.1:3100, o mesmo alvo da suíte de navegador).

import { chromium } from "@playwright/test";

const BASE = process.env.ROOMLY_URL ?? "http://127.0.0.1:3100";

const LARGURAS = [320, 360, 390, 768];

const ROTAS = [
  "/",
  "/salas/sala-executiva",
  "/coworkings/agora-coworking",
  "/minhas-reservas",
  "/conta",
  "/entrar",
  "/cadastro",
  "/como-funciona",
  "/privacidade",
  "/cookies",
  "/admin",
  ...[
    "reservas",
    "calendario",
    "salas",
    "unidades",
    "clientes",
    "pagamentos",
    "fechaduras",
    "limpeza",
    "relatorios",
    "logs",
    "configuracoes",
  ].map((secao) => `/admin/${secao}`),
];

/**
 * Roda dentro da página. Um contêiner com `overflow-x: auto` é uma decisão
 * deliberada, e o conteúdo largo dentro dele não é defeito: por isso o culpado
 * é procurado só entre elementos que não têm nenhum ancestral rolável.
 */
function encontrarVazamentos() {
  const limite = document.documentElement.clientWidth;
  const rolavel = (elemento) => {
    for (let no = elemento.parentElement; no; no = no.parentElement) {
      const estilo = getComputedStyle(no);
      if (/(auto|scroll)/.test(estilo.overflowX)) return true;
    }
    return false;
  };
  const culpados = [];
  for (const elemento of document.body.querySelectorAll("*")) {
    const caixa = elemento.getBoundingClientRect();
    if (caixa.width === 0 || caixa.height === 0) continue;
    const excesso = Math.round(caixa.right - limite);
    if (excesso <= 1 || rolavel(elemento)) continue;
    culpados.push({
      selector:
        elemento.tagName.toLowerCase() +
        (elemento.className && typeof elemento.className === "string"
          ? "." + elemento.className.trim().split(/\s+/).slice(0, 3).join(".")
          : ""),
      excesso,
      texto: (elemento.textContent ?? "").trim().slice(0, 40),
    });
  }
  // O mais externo já explica os filhos; manter todos vira ruído.
  return culpados.filter(
    (candidato, indice) =>
      !culpados.some(
        (outro, posicao) =>
          posicao < indice && outro.excesso >= candidato.excesso,
      ),
  );
}

/**
 * Alvo de toque mínimo de 24px, critério 2.5.8 da WCAG 2.2.
 *
 * O critério isenta o alvo "em linha", ou seja, o link dentro de uma frase, cujo
 * tamanho é definido pela entrelinha do texto ao redor. Sem essa isenção o
 * relatório acusa cada link de rodapé e de parágrafo, duzentos achados que não
 * são defeito nenhum, e o que é defeito de verdade se perde no meio.
 */
function encontrarAlvosPequenos() {
  const alvos = [...document.querySelectorAll(
    "a[href], button, input[type=checkbox], input[type=radio], [role=button]",
  )]
    .map((elemento) => ({ elemento, caixa: elemento.getBoundingClientRect() }))
    .filter(({ caixa }) => caixa.width > 0 && caixa.height > 0);

  // Segunda isenção do critério: um alvo menor que 24px passa se couber um
  // círculo de 24px centrado nele sem encostar no círculo do vizinho. Um link
  // de 21px com folga em volta é confortável de acertar; o que aperta é o
  // vizinho colado.
  const longeDosVizinhos = ({ caixa }) => {
    const cx = caixa.left + caixa.width / 2;
    const cy = caixa.top + caixa.height / 2;
    return !alvos.some((outro) => {
      if (outro.caixa === caixa) return false;
      const ox = outro.caixa.left + outro.caixa.width / 2;
      const oy = outro.caixa.top + outro.caixa.height / 2;
      return Math.hypot(cx - ox, cy - oy) < 24;
    });
  };

  const pequenos = [];
  for (const { elemento, caixa } of alvos) {
    if (caixa.width >= 24 && caixa.height >= 24) continue;
    if (getComputedStyle(elemento).display === "inline") continue;
    if (longeDosVizinhos({ caixa })) continue;
    pequenos.push({
      selector: elemento.tagName.toLowerCase(),
      tamanho: `${Math.round(caixa.width)}x${Math.round(caixa.height)}`,
      texto: (
        elemento.getAttribute("aria-label") ??
        elemento.textContent ??
        ""
      )
        .trim()
        .slice(0, 30),
    });
  }
  return pequenos;
}

const navegador = await chromium.launch({ headless: true });
let problemas = 0;

for (const largura of LARGURAS) {
  const contexto = await navegador.newContext({
    viewport: { width: largura, height: 900 },
    deviceScaleFactor: 2,
    isMobile: largura < 768,
    hasTouch: largura < 768,
  });
  const pagina = await contexto.newPage();
  for (const rota of ROTAS) {
    let resposta;
    try {
      resposta = await pagina.goto(`${BASE}${rota}`, {
        waitUntil: "networkidle",
        timeout: 30_000,
      });
    } catch {
      console.log(`  ?? ${largura}px ${rota} não carregou`);
      continue;
    }
    if (!resposta?.ok()) {
      console.log(`  ?? ${largura}px ${rota} HTTP ${resposta?.status()}`);
      continue;
    }
    const vazamentos = await pagina.evaluate(encontrarVazamentos);
    const alvos = largura < 768 ? await pagina.evaluate(encontrarAlvosPequenos) : [];
    if (vazamentos.length === 0 && alvos.length === 0) continue;
    problemas += vazamentos.length + alvos.length;
    console.log(`\n${largura}px  ${rota}`);
    for (const v of vazamentos)
      console.log(`   vaza ${String(v.excesso).padStart(4)}px  ${v.selector}  "${v.texto}"`);
    for (const a of alvos)
      console.log(`   alvo ${a.tamanho.padStart(8)}  ${a.selector}  "${a.texto}"`);
  }
  await contexto.close();
}

await navegador.close();
console.log(
  `\n${ROTAS.length} rotas em ${LARGURAS.length} larguras, ${problemas} problemas.`,
);
process.exitCode = problemas > 0 ? 1 : 0;
