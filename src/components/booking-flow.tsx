"use client";
import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Check,
  ChevronLeft,
  Clock3,
  CreditCard,
  KeyRound,
  LockKeyhole,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import type { Room } from "@/lib/demo-data";
import { timeSlots } from "@/lib/demo-data";
import {
  addIsoDays,
  formatIsoDay,
  formatIsoWeekday,
  formatMoney,
  nextBookableDay,
} from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import type { CardPaymentData } from "./mercado-pago-card";

const MercadoPagoCard = dynamic(
  () => import("./mercado-pago-card").then((module) => module.MercadoPagoCard),
  { ssr: false },
);

type Stage = "schedule" | "payment" | "confirmed";
export function BookingFlow({
  room,
  today,
  mercadoPagoPublicKey,
}: {
  room: Room;
  /** Dia corrente no fuso da operação, calculado no servidor para evitar divergência de hidratação. */
  today: string;
  mercadoPagoPublicKey?: string;
}) {
  const [stage, setStage] = useState<Stage>("schedule");
  const [selectedTime, setSelectedTime] = useState("14:00");
  const [selectedDate, setSelectedDate] = useState(() => nextBookableDay(today));
  const [duration, setDuration] = useState(60);
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const total = useMemo(
    () => Math.round((room.hourlyPriceCents * duration) / 60),
    [duration, room.hourlyPriceCents],
  );
  const endHour = `${String(Number(selectedTime.slice(0, 2)) + duration / 60).padStart(2, "0")}:00`;
  async function confirm(card?: CardPaymentData) {
    setSubmitting(true);
    setError(null);
    const start = new Date(`${selectedDate}T${selectedTime}:00-03:00`);
    const end = new Date(start.getTime() + duration * 60_000);
    if (start <= new Date()) {
      setError("Escolha uma data e um horário no futuro.");
      setSubmitting(false);
      return false;
    }
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          paymentMethod: method,
          ...(card ?? {}),
          idempotencyKey: idempotencyKey.current,
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Não foi possível criar a reserva.");
      }
      localStorage.setItem(
        "roomly:last-booking",
        JSON.stringify({
          room: room.name,
          date: formatIsoDay(selectedDate),
          time: selectedTime,
          endTime: endHour,
          total,
          code: "583921",
        }),
      );
      setStage("confirmed");
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível reservar.",
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  }
  if (stage === "confirmed")
    return (
      <div
        className="rounded-lg border border-[#cfe4d8] bg-white p-6 shadow-[0_18px_50px_rgba(34,56,46,.08)] sm:p-8"
        data-testid="booking-confirmation"
      >
        <div className="mb-6 grid size-12 place-items-center rounded-md bg-[#176b4d] text-white">
          <Check size={25} />
        </div>
        <Badge tone="success">Reserva confirmada</Badge>
        <h2 className="mt-3 text-2xl font-bold">
          Tudo certo para {formatIsoWeekday(selectedDate)}.
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#66736d]">
          Enviamos os detalhes para você. O código será liberado 5 minutos
          antes.
        </p>
        <div className="my-6 border-y border-[#e0e5e1] py-5">
          <Info label="Sala" value={room.name} />
          <Info label="Horário" value={`${selectedTime} – ${endHour}`} />
          <Info
            label="Pagamento"
            value={method === "pix" ? "PIX aprovado" : "Cartão aprovado"}
          />
        </div>
        <div className="rounded-md bg-[#17211d] p-5 text-white">
          <p className="flex items-center gap-2 text-sm text-white/70">
            <KeyRound size={17} />
            Código de acesso
          </p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <strong className="font-mono text-3xl">583 921</strong>
            <span className="text-right text-xs leading-5 text-white/60">
              Válido das 13:55
              <br />
              às {endHour.replace(":00", ":05")}
            </span>
          </div>
        </div>
        <a
          href="/minhas-reservas"
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#176b4d] text-sm font-bold text-white"
        >
          Ver minhas reservas
        </a>
      </div>
    );
  if (stage === "payment")
    return (
      <div className="rounded-lg border border-[#d9ded9] bg-white p-6 shadow-[0_18px_50px_rgba(34,56,46,.08)] sm:p-7">
        <button
          onClick={() => setStage("schedule")}
          className="mb-5 inline-flex items-center gap-1 text-sm font-bold text-[#53605a]"
        >
          <ChevronLeft size={17} />
          Alterar horário
        </button>
        <p className="text-xs font-bold uppercase text-[#176b4d]">
          Pagamento seguro
        </p>
        <h2 className="mt-1 text-2xl font-bold">Como prefere pagar?</h2>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Method
            active={method === "pix"}
            onClick={() => setMethod("pix")}
            icon={<QrCode size={20} />}
            label="PIX"
          />
          <Method
            active={method === "card"}
            onClick={() => setMethod("card")}
            icon={<CreditCard size={20} />}
            label="Cartão"
          />
        </div>
        {method === "card" && mercadoPagoPublicKey && (
          <MercadoPagoCard
            publicKey={mercadoPagoPublicKey}
            amountCents={total}
            submit={confirm}
          />
        )}
        {method === "card" && !mercadoPagoPublicKey && (
          <div className="mt-4 rounded-md border border-[var(--border-control)] bg-[#f6f7f4] p-4 text-sm text-[#66736d]">
            Pagamento por cartão em modo simulador. Nenhum dado de cartão é
            coletado.
          </div>
        )}
        <div className="my-5 flex items-center justify-between border-y border-[#e2e6e2] py-4">
          <span className="text-sm text-[#66736d]">Total</span>
          <strong className="text-xl">{formatMoney(total)}</strong>
        </div>
        {(method === "pix" || !mercadoPagoPublicKey) && (
          <Button
            className="w-full"
            onClick={() => void confirm()}
            disabled={submitting}
            data-testid="confirm-payment"
          >
            <LockKeyhole size={17} />
            {submitting ? "Processando..." : "Confirmar e pagar"}
          </Button>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm font-semibold text-[#a84331]">
            {error}
          </p>
        )}
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <ShieldCheck size={14} />
          Dados processados pelo Mercado Pago
        </p>
      </div>
    );
  return (
    <div className="rounded-lg border border-[#d9ded9] bg-white p-5 shadow-[0_18px_50px_rgba(34,56,46,.08)] sm:p-7">
      <p className="text-xs font-bold uppercase text-[#176b4d]">
        Reserve agora
      </p>
      <h2 className="mt-1 text-2xl font-bold">Escolha seu horário</h2>
      <label className="mt-5 block">
        <span className="mb-2 block text-xs font-bold text-[#53605a]">
          DATA
        </span>
        <input
          type="date"
          value={selectedDate}
          min={addIsoDays(today, 1)}
          onChange={(event) => setSelectedDate(event.target.value)}
          className="h-11 w-full rounded-md border border-[var(--border-control)] bg-white px-3 text-sm font-semibold"
        />
      </label>
      <div className="mt-5">
        <span className="mb-2 block text-xs font-bold text-[#53605a]">
          INÍCIO
        </span>
        <div className="grid grid-cols-3 gap-2">
          {timeSlots.slice(3, 9).map((time) => (
            <button
              key={time}
              onClick={() => setSelectedTime(time)}
              className={`h-10 rounded-md border text-sm font-semibold ${selectedTime === time ? "border-[#176b4d] bg-[#176b4d] text-white" : "border-[var(--border-control)] hover:border-[#176b4d]"}`}
            >
              {time}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between">
        <div>
          <span className="block text-xs font-bold text-[#53605a]">
            DURAÇÃO
          </span>
          <span className="text-sm text-[#66736d]">Mínimo de 1 hora</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="icon"
            title="Reduzir duração"
            onClick={() => setDuration(Math.max(60, duration - 60))}
          >
            <Minus size={17} />
          </Button>
          <strong className="w-8 text-center">{duration / 60}h</strong>
          <Button
            variant="secondary"
            size="icon"
            title="Aumentar duração"
            onClick={() => setDuration(Math.min(240, duration + 60))}
          >
            <Plus size={17} />
          </Button>
        </div>
      </div>
      <div className="my-5 border-y border-[#e2e6e2] py-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-[#66736d]">
            <Clock3 size={16} />
            {selectedTime} – {endHour}
          </span>
          <strong>{formatMoney(total)}</strong>
        </div>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          O horário fica reservado por 10 minutos durante o pagamento.
        </p>
      </div>
      <Button
        className="w-full"
        onClick={() => setStage("payment")}
        data-testid="continue-booking"
      >
        Continuar
      </Button>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 flex items-center justify-between first:mt-0">
      <span className="text-sm text-[#66736d]">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function Method({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-20 flex-col items-start justify-center rounded-md border p-4 text-left ${active ? "border-[#176b4d] bg-[#eff8f3]" : "border-[#d8ded9]"}`}
    >
      {icon}
      <strong className="mt-2 text-sm">{label}</strong>
    </button>
  );
}
