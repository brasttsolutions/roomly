/**
 * Gera `design-tokens.json` (handoff) e `src/styles/tokens.css` (runtime) a
 * partir de `scripts/design-tokens.mjs`. Reprova se algum par obrigatório de
 * contraste deixar de cumprir o alvo.
 *
 *   node scripts/build-tokens.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  BRAND, palette, semantic, semanticDark, mandatoryPairs, contrast,
  spacing, radius, shadow, typography, breakpoints, grid, motion, target, zIndex,
} from "./design-tokens.mjs";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const falhas = mandatoryPairs
  .map((par) => ({ ...par, ratio: contrast(par.fg, par.bg) }))
  .filter((par) => par.ratio < par.min);

for (const par of mandatoryPairs) {
  const ratio = contrast(par.fg, par.bg).toFixed(2);
  console.log(
    (ratio >= par.min ? "  ok  " : " FALHA ") + par.name.padEnd(40),
    ratio.padStart(6),
    "(min " + par.min + ")",
  );
}

if (falhas.length > 0) {
  console.error("\n" + falhas.length + " par(es) abaixo do alvo. Tokens não gerados.");
  process.exit(1);
}

const tokens = {
  $schema: "https://design-tokens.github.io/community-group/format/",
  brand: BRAND,
  color: { palette, semantic, semanticDark },
  spacing, radius, shadow, typography, breakpoints, grid, motion, target, zIndex,
  accessibility: {
    standard: "WCAG 2.2 AA",
    verifiedPairs: mandatoryPairs.map((par) => ({
      name: par.name,
      foreground: par.fg,
      background: par.bg,
      minimum: par.min,
      ratio: Number(contrast(par.fg, par.bg).toFixed(2)),
    })),
  },
};

writeFileSync(
  resolve(raiz, "design-tokens.json"),
  JSON.stringify(tokens, null, 2) + "\n",
);

const linhas = [];
linhas.push("/* Gerado por scripts/build-tokens.mjs. Não edite à mão. */");
linhas.push(":root {");
for (const [grupo, escala] of Object.entries(palette)) {
  for (const [degrau, hex] of Object.entries(escala)) {
    linhas.push(`  --color-${grupo}-${degrau}: ${hex};`);
  }
}
linhas.push("");
for (const [nome, valor] of Object.entries(semantic)) {
  linhas.push(`  --${nome}: ${valor};`);
}
linhas.push("");
for (const [nome, valor] of Object.entries(spacing)) {
  linhas.push(`  --space-${nome}: ${valor};`);
}
for (const [nome, valor] of Object.entries(radius)) {
  linhas.push(`  --radius-${nome}: ${valor};`);
}
for (const [nome, valor] of Object.entries(shadow)) {
  linhas.push(`  --shadow-${nome}: ${valor};`);
}
for (const [nome, valor] of Object.entries(motion.duration)) {
  linhas.push(`  --duration-${nome}: ${valor};`);
}
for (const [nome, valor] of Object.entries(motion.easing)) {
  linhas.push(`  --ease-${nome}: ${valor};`);
}
for (const [nome, valor] of Object.entries(target)) {
  linhas.push(`  --target-${nome}: ${valor};`);
}
for (const [nome, valor] of Object.entries(zIndex)) {
  linhas.push(`  --z-${nome}: ${valor};`);
}
linhas.push(`  --font-sans: ${typography.family.sans};`);
linhas.push(`  --font-mono: ${typography.family.mono};`);
for (const [nome, v] of Object.entries(typography.scale)) {
  linhas.push(`  --text-${nome}: ${v.size};`);
  linhas.push(`  --text-${nome}-line: ${v.line};`);
  linhas.push(`  --text-${nome}-tracking: ${v.tracking};`);
  linhas.push(`  --text-${nome}-weight: ${v.weight};`);
}
linhas.push("}");
linhas.push("");

/*
 * Três estados, não dois: a preferência explícita carimba `data-theme`, e o
 * padrão do sistema não carimba nada. Sem o `:not([data-theme="light"])` uma
 * escolha clara perderia para um sistema escuro.
 */
const escuro = Object.entries(semanticDark).map(
  ([nome, valor]) => `    --${nome}: ${valor};`,
);
linhas.push("@media (prefers-color-scheme: dark) {");
linhas.push('  :root:not([data-theme="light"]) {');
linhas.push(...escuro);
linhas.push("  }");
linhas.push("}");
linhas.push("");
linhas.push(':root[data-theme="dark"] {');
linhas.push(...escuro.map((linha) => linha.slice(2)));
linhas.push("}");
linhas.push("");
linhas.push("/* Tipos de display encolhem no mobile; corpo e menores não. */");
linhas.push("@media (max-width: 767px) {");
linhas.push("  :root {");
for (const [nome, v] of Object.entries(typography.scale)) {
  if (v.mobile !== v.size) {
    linhas.push(`    --text-${nome}: ${v.mobile};`);
    linhas.push(`    --text-${nome}-line: ${v.mobileLine};`);
  }
}
linhas.push("  }");
linhas.push("}");
linhas.push("");

mkdirSync(resolve(raiz, "src/styles"), { recursive: true });
writeFileSync(resolve(raiz, "src/styles/tokens.css"), linhas.join("\n"));

console.log("\ndesign-tokens.json e src/styles/tokens.css gerados.");
