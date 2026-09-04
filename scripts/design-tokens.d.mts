/** Tipos de `scripts/design-tokens.mjs`, a fonte da verdade dos tokens. */

export type Ramp = Record<number, string>;

export type MandatoryPair = {
  name: string;
  fg: string;
  bg: string;
  min: number;
};

export type TypeStep = {
  size: string;
  line: string;
  tracking: string;
  weight: number;
  mobile: string;
  mobileLine: string;
};

export const BRAND: { coral: string; navy: string; white: string };

export const palette: Record<
  "coral" | "navy" | "slate" | "success" | "warning" | "danger" | "info",
  Ramp
>;

export const semantic: Record<string, string>;
export const mandatoryPairs: MandatoryPair[];

export const spacing: Record<string, string>;
export const radius: Record<string, string>;
export const shadow: Record<string, string>;
export const breakpoints: Record<string, string>;
export const grid: Record<string, Record<string, string | number>>;
export const motion: {
  duration: Record<string, string>;
  easing: Record<string, string>;
};
export const target: { minimum: string; comfortable: string; compact: string };
export const zIndex: Record<string, number>;

export const typography: {
  family: { sans: string; mono: string };
  scale: Record<string, TypeStep>;
};

export function contrast(hexA: string, hexB: string): number;
export function ramp(baseHex: string, baseStep: number): Ramp;
export function hexToRgb(hex: string): number[];
export function rgbToHex(rgb: number[]): string;
export function rgbToOklab(rgb: number[]): number[];
export function oklabToRgb(lab: number[]): number[];
