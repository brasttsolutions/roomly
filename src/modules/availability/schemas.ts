import { z } from "zod";

/** `YYYY-MM-DD` que existe no calendário — 2026-02-31 é recusado. */
export const daySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use uma data no formato AAAA-MM-DD.")
  .refine(
    (day) => new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day,
    "Esta data não existe.",
  );

/** `YYYY-MM`. */
export const monthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Use um mês no formato AAAA-MM.")
  .refine((month) => {
    const index = Number(month.slice(5));
    return index >= 1 && index <= 12;
  }, "Este mês não existe.");
