import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatMoney = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(cents / 100);

export const formatDate = (value: Date | string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export const formatTime = (value: Date | string) =>
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));

export const BOOKING_TIME_ZONE = "America/Sao_Paulo";

const isoDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BOOKING_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Dia corrente no fuso da operação, no formato aceito por `<input type="date">`. */
export const isoDay = (value: Date = new Date()) => isoDayFormatter.format(value);

/** Soma dias a um `YYYY-MM-DD` sem depender do fuso do navegador. */
export const addIsoDays = (day: string, amount: number) =>
  new Date(new Date(`${day}T00:00:00Z`).getTime() + amount * 86_400_000)
    .toISOString()
    .slice(0, 10);

/** Próximo dia reservável: o schema exige início no futuro, então nunca usamos hoje. */
export const nextBookableDay = (today: string = isoDay()) =>
  addIsoDays(today, 1);

const dayInBookingZone = (day: string) => new Date(`${day}T12:00:00-03:00`);

export const formatIsoDay = (day: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: BOOKING_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dayInBookingZone(day));

export const formatIsoWeekday = (day: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: BOOKING_TIME_ZONE,
    weekday: "long",
  }).format(dayInBookingZone(day));
