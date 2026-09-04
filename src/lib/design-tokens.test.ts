import { describe, expect, it } from "vitest";
import {
  BRAND,
  contrast,
  mandatoryPairs,
  palette,
  semantic,
  target,
  typography,
} from "../../scripts/design-tokens.mjs";

describe("tokens de cor", () => {
  it.each(mandatoryPairs)(
    "$name cumpre o contraste mínimo",
    ({ fg, bg, min }) => {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
    },
  );

  it("preserva as cores da marca nos degraus âncora", () => {
    expect(palette.coral[500]).toBe(BRAND.coral.toUpperCase());
    expect(palette.navy[900]).toBe(BRAND.navy.toUpperCase());
  });

  it("mantém as rampas monotônicas do claro para o escuro", () => {
    for (const [nome, escala] of Object.entries(palette)) {
      const degraus = Object.keys(escala)
        .map(Number)
        .sort((a, b) => a - b);
      for (let i = 1; i < degraus.length; i += 1) {
        const claro = contrast(escala[degraus[i - 1]], "#000000");
        const escuro = contrast(escala[degraus[i]], "#000000");
        expect(
          claro,
          `${nome}: o degrau ${degraus[i]} deveria ser mais escuro que ${degraus[i - 1]}`,
        ).toBeGreaterThan(escuro);
      }
    }
  });

  it("não permite branco sobre o coral da marca em texto normal", () => {
    // Documenta a razão do rótulo navy: o coral vivo não sustenta texto branco.
    expect(contrast("#FFFFFF", palette.coral[500])).toBeLessThan(4.5);
    expect(semantic["text-on-accent"]).toBe(palette.navy[900]);
  });
});

describe("tokens estruturais", () => {
  it("respeita o alvo de toque de 44px da WCAG 2.2 (2.5.8)", () => {
    expect(Number.parseInt(target.minimum, 10)).toBeGreaterThanOrEqual(44);
  });

  it("nunca reduz o corpo de texto abaixo de 16px", () => {
    expect(Number.parseInt(typography.scale.body.size, 10)).toBeGreaterThanOrEqual(16);
    expect(Number.parseInt(typography.scale.body.mobile, 10)).toBeGreaterThanOrEqual(16);
  });

  it("mantém entrelinha de leitura de pelo menos 1.5 no corpo", () => {
    const tamanho = Number.parseInt(typography.scale.body.size, 10);
    const linha = Number.parseInt(typography.scale.body.line, 10);
    expect(linha / tamanho).toBeGreaterThanOrEqual(1.5);
  });
});
