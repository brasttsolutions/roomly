// Toda relação embutida numa consulta PostgREST resolvida contra o schema real.
//
// `select("bookings(...)")` só falha quando existe uma chave estrangeira para
// resolver, e o modo simulador nunca chega ao banco. Foi assim que quatro telas
// do painel continuaram pedindo `profiles(name)` depois de a migração de
// marketplace ter derrubado essa chave: nenhum teste tocava no PostgREST.
//
// Uso: `npm run test:embeds`, com o Supabase local de pé.

import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const RAIZ = "src";

/** `.from("x")` seguido de `.select("...")`, o encadeamento usado no projeto. */
const CONSULTA = /\.from\(\s*"(\w+)"\s*\)[\s\S]{0,80}?\.select\(\s*"([^"]+)"/g;
/** `tabela(colunas)` dentro do select é o que exige uma chave estrangeira. */
const TEM_EMBED = /\w+\s*\(/;

function arquivos(diretorio) {
  return readdirSync(diretorio).flatMap((nome) => {
    const caminho = join(diretorio, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return caminho.endsWith(".ts") && !caminho.endsWith(".test.ts")
      ? [caminho]
      : [];
  });
}

function credenciais() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
  }
  // Comando único em vez de argumentos separados: o Node 24 no Windows recusa
  // executar `npx.cmd` sem shell, e passar argumentos com shell é depreciado.
  const status = JSON.parse(
    execSync("npx supabase status -o json", { encoding: "utf8" }),
  );
  return { url: status.API_URL, key: status.SERVICE_ROLE_KEY };
}

const consultas = arquivos(RAIZ).flatMap((caminho) => {
  const fonte = readFileSync(caminho, "utf8");
  return [...fonte.matchAll(CONSULTA)]
    .filter(([, , select]) => TEM_EMBED.test(select))
    .map(([trecho, tabela, select]) => ({
      caminho,
      linha: fonte.slice(0, fonte.indexOf(trecho)).split("\n").length,
      tabela,
      select,
    }));
});

const { url, key } = credenciais();
const db = createClient(url, key, { auth: { persistSession: false } });

let quebradas = 0;
for (const { caminho, linha, tabela, select } of consultas) {
  // `limit(0)` porque a relação é resolvida antes de qualquer linha ser lida.
  const { error } = await db.from(tabela).select(select).limit(0);
  if (error) {
    quebradas += 1;
    console.error(`FALHA ${caminho}:${linha}  ${tabela}`);
    console.error(`      ${select}`);
    console.error(`      ${error.code}: ${error.message}`);
  } else {
    console.log(`ok    ${caminho}:${linha}  ${tabela}`);
  }
}

console.log(
  `\n${consultas.length} consultas com relação embutida, ${quebradas} sem resolver.`,
);
process.exitCode = quebradas > 0 ? 1 : 0;
