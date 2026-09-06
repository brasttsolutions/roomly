// Recusa o build de contêiner sem as variáveis que vão para dentro do bundle.
//
// O Next embute toda `NEXT_PUBLIC_` durante o build. Faltando uma, o build
// termina com sucesso e a imagem sobe quebrada só no navegador: sem chave do
// Supabase, sem formulário de cartão, sem foto de sala. O erro aparece para o
// cliente, não para quem publicou.
//
// Só vale para o build de imagem, marcado por `NEXT_STANDALONE`. O build local
// continua livre para rodar sem nada configurado.

import { existsSync, readFileSync } from "node:fs";

const OBRIGATORIAS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
];

/**
 * O `next build` carrega os arquivos `.env` sozinho, então a trava precisa
 * enxergar o mesmo que ele. Sem isto, testar o build de contêiner na máquina de
 * quem desenvolve falhava com as variáveis ali no `.env.local`. No Railway
 * nenhum desses arquivos existe, porque o build sai do repositório.
 */
function doArquivo(nome) {
  for (const arquivo of [".env.local", ".env.production", ".env"]) {
    if (!existsSync(arquivo)) continue;
    for (const linha of readFileSync(arquivo, "utf8").split("\n")) {
      const [chave, ...resto] = linha.split("=");
      if (chave?.trim() === nome) return resto.join("=").trim();
    }
  }
  return "";
}

if (process.env.NEXT_STANDALONE === "true") {
  const faltando = OBRIGATORIAS.filter(
    (nome) => !(process.env[nome]?.trim() || doArquivo(nome)),
  );
  if (faltando.length > 0) {
    console.error(
      `Build de contêiner sem ${faltando.join(", ")}.\n` +
        "Essas variáveis são embutidas no bundle durante o build, então precisam\n" +
        "existir aqui e não só no contêiner que roda. No Railway, basta que\n" +
        "estejam em Variables antes de disparar o deploy.",
    );
    process.exitCode = 1;
  }
}
