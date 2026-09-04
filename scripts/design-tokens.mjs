/**
 * Fonte única dos tokens de cor do Roomly.
 *
 * As rampas são geradas em OKLab para que os degraus tenham distância
 * perceptual uniforme — interpolar em sRGB produz meios sujos e claros
 * lavados. O contraste é medido pela fórmula da WCAG 2.x sobre luminância
 * relativa, e os pares obrigatórios ficam declarados em `mandatoryPairs`
 * para que um teste possa reprovar qualquer regressão.
 *
 * Regenerar: node scripts/build-tokens.mjs
 */

const srgbToLinear = (c) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const linearToSrgb = (c) =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

export const hexToRgb = (hex) =>
  [0, 2, 4].map(
    (i) => parseInt(hex.replace("#", "").slice(i, i + 2), 16) / 255,
  );

export const rgbToHex = ([r, g, b]) =>
  "#" +
  [r, g, b]
    .map((v) =>
      Math.round(Math.min(1, Math.max(0, v)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase();

export function rgbToOklab([r, g, b]) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklabToRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const relativeLuminance = ([r, g, b]) =>
  0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);

/** Razão de contraste WCAG 2.x entre duas cores opacas. */
export function contrast(hexA, hexB) {
  const a = relativeLuminance(hexToRgb(hexA));
  const b = relativeLuminance(hexToRgb(hexB));
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

const LIGHTNESS = {
  50: 0.977, 100: 0.945, 200: 0.892, 300: 0.822, 400: 0.735,
  500: 0.645, 600: 0.556, 700: 0.462, 800: 0.372, 900: 0.28, 950: 0.21,
};

// Saturação cai nos extremos: nem o quase-branco nem o quase-preto sustentam
// chroma alto sem sair do gamut sRGB.
const CHROMA = {
  50: 0.14, 100: 0.26, 200: 0.44, 300: 0.66, 400: 0.86,
  500: 1.0, 600: 1.0, 700: 0.94, 800: 0.84, 900: 0.72, 950: 0.6,
};

/** Gera uma rampa de 11 degraus ancorada na cor da marca em `baseStep`. */
export function ramp(baseHex, baseStep) {
  const [, a0, b0] = rgbToOklab(hexToRgb(baseHex));
  const anchor = CHROMA[baseStep];
  const out = {};
  for (const step of Object.keys(LIGHTNESS)) {
    if (Number(step) === baseStep) {
      out[step] = baseHex.toUpperCase();
      continue;
    }
    const k = CHROMA[step] / anchor;
    out[step] = rgbToHex(oklabToRgb([LIGHTNESS[step], a0 * k, b0 * k]));
  }
  return out;
}

export const BRAND = {
  coral: "#FB5131",
  navy: "#172243",
  white: "#FFFFFF",
};

export const palette = {
  coral: ramp(BRAND.coral, 500),
  navy: ramp(BRAND.navy, 900),
  // Neutro com viés azul herdado do navy: cinza puro ao lado do navy suja.
  slate: ramp("#5A6480", 600),
  success: ramp("#0E9F6E", 600),
  warning: ramp("#B45309", 700),
  danger: ramp("#C2103A", 700),
  info: ramp("#2563C9", 600),
};

const p = palette;

/**
 * Camada semântica. Componentes referenciam só estes nomes — nunca um degrau
 * cru — para que trocar um valor não exija varrer a base de código.
 */
export const semantic = {
  "surface-page": p.navy[50],
  "surface-raised": BRAND.white,
  "surface-sunken": p.navy[100],
  "surface-inverse": p.navy[900],
  "surface-accent-subtle": p.coral[50],

  "text-primary": p.navy[900],
  "text-secondary": p.slate[600],
  "text-inverse": BRAND.white,
  "text-on-accent": p.navy[900],
  "text-link": p.navy[700],

  "border-subtle": p.slate[200],
  "border-default": p.slate[300],
  "border-control": p.slate[500],
  "border-strong": p.slate[600],

  "action-primary": p.coral[500],
  "action-primary-hover": p.coral[400],
  "action-primary-active": p.coral[300],
  "action-secondary-border": p.slate[500],

  "focus-ring": p.navy[900],
  "focus-ring-inverse": BRAND.white,

  "success-surface": p.success[50],
  "success-text": p.success[700],
  "success-border": p.success[600],
  "warning-surface": p.warning[50],
  "warning-text": p.warning[800],
  "warning-border": p.warning[600],
  "danger-surface": p.danger[50],
  "danger-text": p.danger[700],
  "danger-border": p.danger[600],
  "danger-action": p.danger[600],
  "info-surface": p.info[50],
  "info-text": p.info[700],
  "info-border": p.info[600],
};

/**
 * Contratos de contraste que o sistema promete cumprir.
 * `min` 4.5 = texto normal, 3 = texto grande, componente de UI ou borda de
 * controle (WCAG 1.4.11 e 2.4.11).
 */
export const mandatoryPairs = [
  { name: "texto primário sobre página", fg: semantic["text-primary"], bg: semantic["surface-page"], min: 4.5 },
  { name: "texto primário sobre card", fg: semantic["text-primary"], bg: semantic["surface-raised"], min: 4.5 },
  { name: "texto secundário sobre card", fg: semantic["text-secondary"], bg: semantic["surface-raised"], min: 4.5 },
  { name: "texto secundário sobre página", fg: semantic["text-secondary"], bg: semantic["surface-page"], min: 4.5 },
  { name: "link sobre card", fg: semantic["text-link"], bg: semantic["surface-raised"], min: 4.5 },
  { name: "rótulo sobre ação primária", fg: semantic["text-on-accent"], bg: semantic["action-primary"], min: 4.5 },
  { name: "rótulo sobre ação primária (hover)", fg: semantic["text-on-accent"], bg: semantic["action-primary-hover"], min: 4.5 },
  { name: "rótulo sobre ação primária (ativo)", fg: semantic["text-on-accent"], bg: semantic["action-primary-active"], min: 4.5 },
  { name: "rótulo sobre ação destrutiva", fg: semantic["text-inverse"], bg: semantic["danger-action"], min: 4.5 },
  { name: "borda de controle sobre card", fg: semantic["border-control"], bg: semantic["surface-raised"], min: 3 },
  { name: "borda de controle sobre página", fg: semantic["border-control"], bg: semantic["surface-page"], min: 3 },
  { name: "anel de foco sobre página", fg: semantic["focus-ring"], bg: semantic["surface-page"], min: 3 },
  { name: "anel de foco sobre ação primária", fg: semantic["focus-ring"], bg: semantic["action-primary"], min: 3 },
  { name: "anel de foco sobre superfície escura", fg: semantic["focus-ring-inverse"], bg: semantic["surface-inverse"], min: 3 },
  { name: "texto inverso sobre superfície escura", fg: semantic["text-inverse"], bg: semantic["surface-inverse"], min: 4.5 },
  { name: "acento sobre superfície escura", fg: p.coral[400], bg: semantic["surface-inverse"], min: 4.5 },
  { name: "texto de sucesso sobre seu fundo", fg: semantic["success-text"], bg: semantic["success-surface"], min: 4.5 },
  { name: "texto de alerta sobre seu fundo", fg: semantic["warning-text"], bg: semantic["warning-surface"], min: 4.5 },
  { name: "texto de erro sobre seu fundo", fg: semantic["danger-text"], bg: semantic["danger-surface"], min: 4.5 },
  { name: "texto informativo sobre seu fundo", fg: semantic["info-text"], bg: semantic["info-surface"], min: 4.5 },
  { name: "texto sobre acento suave", fg: semantic["text-primary"], bg: semantic["surface-accent-subtle"], min: 4.5 },
];

/** Escala de 8px. O 2 e o 4 existem só para ajuste óptico de ícone e borda. */
export const spacing = {
  0: "0px", 1: "2px", 2: "4px", 3: "8px", 4: "12px", 5: "16px",
  6: "24px", 7: "32px", 8: "48px", 9: "64px", 10: "96px", 11: "128px",
};

export const radius = {
  none: "0px",
  sm: "6px",
  md: "10px",
  lg: "14px",
  xl: "20px",
  full: "9999px",
};

/**
 * Sombras tingidas de navy. Sombra cinza-neutra sobre superfície azulada
 * aparenta fumaça; a tinta da marca mantém a profundidade limpa.
 */
export const shadow = {
  none: "none",
  sm: "0 1px 2px rgba(23,34,67,.06), 0 1px 1px rgba(23,34,67,.04)",
  md: "0 4px 12px rgba(23,34,67,.08), 0 1px 3px rgba(23,34,67,.06)",
  lg: "0 12px 32px rgba(23,34,67,.10), 0 2px 8px rgba(23,34,67,.06)",
  xl: "0 24px 64px rgba(23,34,67,.14), 0 4px 12px rgba(23,34,67,.08)",
  focus: `0 0 0 2px ${BRAND.white}, 0 0 0 4px ${semantic["focus-ring"]}`,
};

export const typography = {
  family: {
    sans: "var(--font-geist-sans), system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "var(--font-geist-mono), ui-monospace, 'Cascadia Code', monospace",
  },
  // size / line-height / letter-spacing / weight
  scale: {
    display: { size: "56px", line: "60px", tracking: "-0.02em", weight: 700, mobile: "40px", mobileLine: "44px" },
    headline: { size: "40px", line: "46px", tracking: "-0.02em", weight: 700, mobile: "30px", mobileLine: "36px" },
    title1: { size: "30px", line: "38px", tracking: "-0.01em", weight: 700, mobile: "24px", mobileLine: "31px" },
    title2: { size: "24px", line: "31px", tracking: "-0.01em", weight: 700, mobile: "20px", mobileLine: "27px" },
    title3: { size: "20px", line: "27px", tracking: "0", weight: 600, mobile: "18px", mobileLine: "25px" },
    body: { size: "16px", line: "25px", tracking: "0", weight: 400, mobile: "16px", mobileLine: "25px" },
    callout: { size: "15px", line: "23px", tracking: "0", weight: 500, mobile: "15px", mobileLine: "23px" },
    subheadline: { size: "14px", line: "21px", tracking: "0", weight: 600, mobile: "14px", mobileLine: "21px" },
    footnote: { size: "13px", line: "19px", tracking: "0.01em", weight: 400, mobile: "13px", mobileLine: "19px" },
    caption: { size: "12px", line: "17px", tracking: "0.02em", weight: 500, mobile: "12px", mobileLine: "17px" },
  },
};

export const breakpoints = {
  mobile: "375px",
  tablet: "768px",
  laptop: "1024px",
  desktop: "1440px",
  wide: "1920px",
};

export const grid = {
  mobile: { columns: 4, margin: "16px", gutter: "16px", maxWidth: "100%" },
  tablet: { columns: 8, margin: "24px", gutter: "20px", maxWidth: "100%" },
  laptop: { columns: 12, margin: "32px", gutter: "24px", maxWidth: "1200px" },
  desktop: { columns: 12, margin: "40px", gutter: "24px", maxWidth: "1440px" },
};

export const motion = {
  duration: { instant: "80ms", fast: "140ms", base: "200ms", slow: "320ms", deliberate: "480ms" },
  easing: {
    standard: "cubic-bezier(.2,0,0,1)",
    decelerate: "cubic-bezier(0,0,0,1)",
    accelerate: "cubic-bezier(.3,0,1,1)",
    spring: "cubic-bezier(.34,1.56,.64,1)",
  },
};

/** Alvo mínimo de toque. 44px é o piso da HIG e satisfaz a WCAG 2.2 2.5.8. */
export const target = { minimum: "44px", comfortable: "48px", compact: "36px" };

export const zIndex = {
  base: 0, raised: 10, sticky: 20, header: 30, drawer: 40,
  overlay: 50, modal: 60, popover: 70, toast: 80, tooltip: 90,
};
