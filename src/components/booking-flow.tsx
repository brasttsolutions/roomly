"use client";
import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  Clock3,
  CreditCard,
  KeyRound,
  LockKeyhole,
  LogIn,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import type { Room } from "@/lib/demo-data";
import { signInHref, signUpHref } from "@/lib/redirect";
import {
  addIsoMonths,
  formatDuration,
  formatIsoDay,
  formatIsoWeekday,
  formatMoney,
} from "@/lib/utils";
import { useDayAvailability, useMonthAvailability } from "./use-availability";
import { Alert } from "./ui/alert";
import { BookingSummary } from "./ui/booking-summary";
import { AvailabilityCalendar } from "./ui/availability-calendar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Stepper } from "./ui/stepper";
import { TimeSlotPicker } from "./ui/time-slot-picker";
import type { CardPaymentData } from "./mercado-pago-card";

const MercadoPagoCard = dynamic(
  () => import("./mercado-pago-card").then((module) => module.MercadoPagoCard),
  { ssr: false },
);

type Stage = "schedule" | "payment" | "confirmed";
const STEPS = ["Horário", "Pagamento", "Confirmação"] as const;
export function BookingFlow({
  room,
  today,
  mercadoPagoPublicKey,
  signedIn,
  resume,
}: {
  room: Room;
  /** Dia corrente no fuso da operação, calculado no servidor para evitar divergência de hidratação. */
  today: string;
  mercadoPagoPublicKey?: string;
  /** Se existe cliente autenticado nesta requisição. Decide se o pagamento abre. */
  signedIn: boolean;
  /** Horário que a pessoa tinha escolhido antes de ser mandada para o login. */
  resume?: { day?: string; time?: string; durationMinutes?: number };
}) {
  const [stage, setStage] = useState<Stage>("schedule");
  // Hoje é reservável: os blocos que já passaram vêm desabilitados da API, com
  // o motivo. Empurrar todo mundo para amanhã escondia metade do estoque.
  const [selectedDate, setSelectedDate] = useState(() =>
    resumedDay(resume?.day, today),
  );
  const [month, setMonth] = useState(() =>
    resumedDay(resume?.day, today).slice(0, 7),
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(
    resume?.time ?? null,
  );
  const [duration, setDuration] = useState(resume?.durationMinutes ?? 60);
  // Só vira `true` quando o servidor recusa por sessão: é o caso de quem entrou,
  // deixou a aba aberta e voltou depois de o token vencer.
  const [sessionExpired, setSessionExpired] = useState(false);
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmedSlot | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  const day = useDayAvailability(room.slug, selectedDate);
  const calendar = useMonthAvailability(room.slug, month);
  const available = day.data;
  const minimumMinutes = available?.minimumMinutes ?? 60;
  const maximumMinutes = available?.maximumMinutes ?? 240;
  const blocks = useMemo(() => available?.blocks ?? [], [available]);
  const bookable = useMemo(
    () =>
      blocks.filter(
        (block) =>
          block.state === "available" &&
          block.maxDurationMinutes >= minimumMinutes,
      ),
    [blocks, minimumMinutes],
  );
  // Horário e duração são derivados, não sincronizados por efeito: a escolha da
  // pessoa vale enquanto o dia a comporta, e o primeiro bloco livre assume
  // quando não comporta. Guardar isso em efeito renderizaria duas vezes e
  // deixaria um quadro com o horário do dia anterior na tela.
  const activeTime =
    selectedTime && bookable.some((block) => block.time === selectedTime)
      ? selectedTime
      : (bookable[0]?.time ?? null);
  const selectedBlock =
    bookable.find((block) => block.time === activeTime) ?? null;
  // O próximo bloco ocupado é o teto real: não adianta oferecer duas horas onde
  // cabe uma.
  const durationCeiling = Math.min(
    selectedBlock?.maxDurationMinutes ?? maximumMinutes,
    maximumMinutes,
  );
  const activeDuration = clampDuration(
    duration,
    minimumMinutes,
    durationCeiling,
  );

  const total = useMemo(
    () => Math.round((room.hourlyPriceCents * activeDuration) / 60),
    [activeDuration, room.hourlyPriceCents],
  );
  const nextOpenDay =
    calendar.data?.days.find(
      (summary) =>
        summary.day > selectedDate &&
        (summary.state === "free" || summary.state === "partial"),
    )?.day ?? null;
  const timeZone = available?.timeZone ?? "America/Sao_Paulo";
  const endHour = selectedBlock
    ? clockLabel(
        new Date(Date.parse(selectedBlock.startAt) + activeDuration * 60_000),
        timeZone,
      )
    : "--:--";

  // Endereço desta mesma tela com a escolha embutida. Quem sai daqui para
  // entrar ou criar conta volta com o dia, a hora e a duração no lugar, em vez
  // de reencontrar a grade em branco e ter que caçar o horário de novo.
  const returnTo = useMemo(() => {
    const query = new URLSearchParams({
      dia: selectedDate,
      duracao: String(activeDuration),
    });
    if (activeTime) query.set("hora", activeTime);
    return `/salas/${room.slug}?${query.toString()}`;
  }, [activeDuration, activeTime, room.slug, selectedDate]);

  /** O hold venceu: o horário voltou para a grade e o pagamento não vale mais. */
  function expireHold() {
    setHoldExpiresAt(null);
    setError("O horário reservado expirou. Escolha outro horário.");
    setStage("schedule");
  }

  async function confirm(card?: CardPaymentData) {
    setSubmitting(true);
    setError(null);
    if (!selectedBlock) {
      setError("Escolha um horário disponível antes de continuar.");
      setSubmitting(false);
      return false;
    }
    // O início vem do próprio bloco: reconstruir a data com fuso fixo no cliente
    // era a chance de divergir do horário que a API declarou livre.
    const start = new Date(selectedBlock.startAt);
    const end = new Date(start.getTime() + activeDuration * 60_000);
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
      const body = (await response.json()) as {
        error?: string;
        holdExpiresAt?: string;
      };
      // Mesmo quando o pagamento falha, o hold pode já existir: o contador do
      // resumo passa a valer para quem vai tentar de novo.
      if (body.holdExpiresAt) setHoldExpiresAt(body.holdExpiresAt);
      // A sessão venceu entre abrir a tela e pagar. "Autenticação necessária"
      // não diz o que fazer; o caminho de volta, sim.
      if (response.status === 401) {
        setSessionExpired(true);
        return false;
      }
      if (!response.ok) {
        throw new Error(body.error ?? "Não foi possível criar a reserva.");
      }
      // Congela o horário que foi vendido: a grade continua viva atrás da tela
      // de confirmação e não deve reescrever o que a pessoa acabou de comprar.
      setConfirmed({
        time: selectedBlock.time,
        endTime: endHour,
        accessFrom: clockLabel(new Date(start.getTime() - 300_000), timeZone),
        accessTo: clockLabel(new Date(end.getTime() + 300_000), timeZone),
      });
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
        className="rounded-lg border border-border-subtle bg-surface-raised p-6 shadow-[0_18px_50px_rgba(34,56,46,.08)] sm:p-8"
        data-testid="booking-confirmation"
      >
        <Stepper steps={STEPS} current={2} className="mb-6" />
        <div className="mb-6 grid size-12 place-items-center rounded-md bg-action-primary text-text-on-accent">
          <Check size={25} />
        </div>
        <Badge tone="success">Reserva confirmada</Badge>
        <h2 className="mt-3 text-title2 font-bold">
          Tudo certo para {formatIsoWeekday(selectedDate)}.
        </h2>
        <p className="mt-2 text-subheadline leading-6 text-text-secondary">
          Enviamos os detalhes para você. O código será liberado 5 minutos
          antes.
        </p>
        <div className="my-6 border-y border-border-subtle py-5">
          <Info label="Sala" value={room.name} />
          <Info
            label="Horário"
            value={`${confirmed?.time ?? "--:--"} – ${confirmed?.endTime ?? "--:--"}`}
          />
          <Info
            label="Pagamento"
            value={method === "pix" ? "PIX aprovado" : "Cartão aprovado"}
          />
        </div>
        {/* Nenhum código aqui: a provisão na fechadura acontece depois da
            aprovação do pagamento, e mostrar um número agora seria inventar. */}
        <div className="rounded-md bg-surface-inverse p-5 text-text-inverse">
          <p className="flex items-center gap-2 text-subheadline opacity-70">
            <KeyRound size={17} aria-hidden="true" />
            Código de acesso
          </p>
          <p className="mt-3 text-subheadline leading-6">
            Liberado das{" "}
            <strong>{confirmed?.accessFrom ?? "--:--"}</strong> às{" "}
            <strong>{confirmed?.accessTo ?? "--:--"}</strong>. Ele aparece na
            ficha da reserva assim que a fechadura confirmar.
          </p>
        </div>
        <Link
          href="/minhas-reservas"
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-action-primary text-subheadline font-bold text-text-on-accent"
        >
          Ver minhas reservas
        </Link>
      </div>
    );
  // A sessão caiu no meio do pagamento. Manter o formulário de cartão na tela
  // convidaria a pessoa a digitar de novo o que já não vai passar.
  if (stage === "payment" && sessionExpired)
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-raised p-6 shadow-[0_18px_50px_rgba(34,56,46,.08)] sm:p-7">
        <Stepper steps={STEPS} current={1} className="mb-5" />
        <Alert tone="warning" className="mb-5" title="Sua sessão expirou">
          Nenhuma cobrança foi feita. Entre de novo para concluir a reserva.
        </Alert>
        <AuthGate
          destination={returnTo}
          hasSlot={Boolean(selectedBlock)}
          title="Entre de novo para concluir"
        />
      </div>
    );
  if (stage === "payment")
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-raised p-6 shadow-[0_18px_50px_rgba(34,56,46,.08)] sm:p-7">
        <Stepper steps={STEPS} current={1} className="mb-5" />
        <button
          onClick={() => setStage("schedule")}
          className="mb-5 inline-flex items-center gap-1 text-subheadline font-bold text-text-secondary"
        >
          <ChevronLeft size={17} />
          Alterar horário
        </button>
        {selectedBlock && (
          <BookingSummary
            className="mb-5"
            roomName={room.name}
            unit={room.location}
            address={room.address}
            day={selectedDate}
            startTime={selectedBlock.time}
            endTime={endHour}
            durationMinutes={activeDuration}
            hourlyPriceCents={room.hourlyPriceCents}
            totalCents={total}
            holdExpiresAt={holdExpiresAt}
            onChange={() => setStage("schedule")}
            onExpired={expireHold}
          />
        )}
        <p className="text-caption font-bold uppercase text-text-link">
          Pagamento seguro
        </p>
        <h2 className="mt-1 text-title2 font-bold">Como prefere pagar?</h2>
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
          <div className="mt-4 rounded-md border border-[var(--border-control)] bg-surface-page p-4 text-subheadline text-text-secondary">
            Pagamento por cartão em modo simulador. Nenhum dado de cartão é
            coletado.
          </div>
        )}
        {(method === "pix" || !mercadoPagoPublicKey) && (
          <Button
            className="mt-5 w-full"
            onClick={() => void confirm()}
            disabled={submitting}
            data-testid="confirm-payment"
          >
            <LockKeyhole size={17} />
            {submitting ? "Processando..." : `Pagar ${formatMoney(total)}`}
          </Button>
        )}
        {error && (
          <Alert tone="danger" className="mt-3">
            {error}
          </Alert>
        )}
        <p className="mt-3 flex items-center justify-center gap-1.5 text-caption text-[var(--text-secondary)]">
          <ShieldCheck size={14} />
          Dados processados pelo Mercado Pago
        </p>
      </div>
    );
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised p-5 shadow-[0_18px_50px_rgba(34,56,46,.08)] sm:p-7">
      <Stepper steps={STEPS} current={0} className="mb-5" />
      <p className="text-caption font-bold uppercase text-text-link">
        Reserve agora
      </p>
      <h2 className="mt-1 text-title2 font-bold">Escolha seu horário</h2>
      {error && (
        <Alert tone="danger" className="mt-4">
          {error}
        </Alert>
      )}
      <div className="mt-5">
        <span className="mb-2 block text-caption font-bold text-text-secondary">
          DATA
        </span>
        <AvailabilityCalendar
          month={month}
          days={calendar.data?.days ?? []}
          selected={selectedDate}
          onSelect={setSelectedDate}
          onMonthChange={setMonth}
          loading={calendar.loading}
        />
      </div>
      <div className="mt-5">
        <span className="mb-2 block text-caption font-bold text-text-secondary">
          INÍCIO EM {formatIsoDay(selectedDate).toUpperCase()}
        </span>
        {day.error ? (
          <Alert tone="danger" title="Disponibilidade indisponível">
            {day.error}
          </Alert>
        ) : (
          <>
            <TimeSlotPicker
              blocks={blocks}
              minimumMinutes={minimumMinutes}
              selected={activeTime}
              durationMinutes={activeDuration}
              onSelect={(block) => setSelectedTime(block.time)}
              loading={day.loading}
            />
            {!day.loading && bookable.length === 0 && (
              <Alert tone="warning" className="mt-3">
                Nenhum horário livre em {formatIsoDay(selectedDate)}.{" "}
                {/* Beco sem saída não é resposta: quem chega às 20h precisa de
                    um caminho, não de um aviso. */}
                {nextOpenDay ? (
                  <Button
                    variant="link"
                    onClick={() => setSelectedDate(nextOpenDay)}
                  >
                    Ver {formatIsoDay(nextOpenDay)}
                  </Button>
                ) : (
                  <Button
                    variant="link"
                    onClick={() => setMonth(addIsoMonths(month, 1))}
                  >
                    Procurar no próximo mês
                  </Button>
                )}
              </Alert>
            )}
          </>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <div>
          <span className="block text-caption font-bold text-text-secondary">
            DURAÇÃO
          </span>
          <span className="text-subheadline text-text-secondary">
            {selectedBlock
              ? `Até ${formatDuration(durationCeiling)} a partir das ${selectedBlock.time}`
              : `Mínimo de ${formatDuration(minimumMinutes)}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="icon"
            title="Reduzir duração"
            disabled={activeDuration <= minimumMinutes}
            onClick={() =>
              setDuration(
                clampDuration(activeDuration - 30, minimumMinutes, durationCeiling),
              )
            }
          >
            <Minus size={17} />
          </Button>
          <strong className="w-14 text-center text-subheadline">
            {formatDuration(activeDuration)}
          </strong>
          <Button
            variant="secondary"
            size="icon"
            title="Aumentar duração"
            disabled={activeDuration >= durationCeiling}
            onClick={() =>
              setDuration(
                clampDuration(activeDuration + 30, minimumMinutes, durationCeiling),
              )
            }
          >
            <Plus size={17} />
          </Button>
        </div>
      </div>
      {selectedBlock ? (
        <BookingSummary
          className="my-5"
          roomName={room.name}
          unit={room.location}
          address={room.address}
          day={selectedDate}
          startTime={selectedBlock.time}
          endTime={endHour}
          durationMinutes={activeDuration}
          hourlyPriceCents={room.hourlyPriceCents}
          totalCents={total}
        />
      ) : (
        <p className="my-5 flex items-center gap-2 text-subheadline text-text-secondary">
          <Clock3 size={16} aria-hidden="true" />
          Escolha um horário para ver o total.
        </p>
      )}
      {/* Sem conta, o pagamento não abre. A recusa já existia no servidor, mas
          só chegava depois de o cartão ter sido digitado e enviado ao Mercado
          Pago para virar token — trabalho e dado de cartão gastos numa reserva
          que nunca poderia nascer. O limite passa a valer aqui, na fronteira
          entre escolher o horário e pagar. */}
      {signedIn ? (
        <Button
          className="w-full"
          disabled={!selectedBlock}
          onClick={() => setStage("payment")}
          data-testid="continue-booking"
        >
          Continuar
        </Button>
      ) : (
        <AuthGate destination={returnTo} hasSlot={Boolean(selectedBlock)} />
      )}
    </div>
  );
}

/**
 * O convite para entrar ou criar conta, no lugar do botão de continuar.
 *
 * Criar conta vem primeiro porque quem chega de uma busca por sala não tem
 * conta; quem tem reconhece "Já tenho conta" sem precisar que ela seja o botão
 * mais forte da tela.
 */
function AuthGate({
  destination,
  hasSlot,
  title = "Entre para concluir a reserva",
}: {
  destination: string;
  hasSlot: boolean;
  title?: string;
}) {
  return (
    <div
      className="rounded-md border border-border-subtle bg-surface-page p-4"
      data-testid="auth-gate"
    >
      <p className="flex items-center gap-2 text-subheadline font-bold">
        <LockKeyhole size={17} aria-hidden="true" />
        {title}
      </p>
      <p className="mt-2 text-subheadline leading-6 text-text-secondary">
        A sala fica reservada no seu nome e o código de acesso vai para a sua
        conta.{" "}
        {hasSlot
          ? "Guardamos o horário escolhido enquanto você entra."
          : "Escolha o horário e conclua em seguida."}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link
          href={signUpHref(destination)}
          data-testid="auth-gate-signup"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-action-primary px-4 text-callout font-semibold text-text-on-accent hover:bg-action-primary-hover"
        >
          <UserPlus size={17} aria-hidden="true" />
          Criar conta
        </Link>
        <Link
          href={signInHref(destination)}
          data-testid="auth-gate-signin"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border-control bg-surface-raised px-4 text-callout font-semibold hover:bg-surface-page"
        >
          <LogIn size={17} aria-hidden="true" />
          Já tenho conta
        </Link>
      </div>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 flex items-center justify-between first:mt-0">
      <span className="text-subheadline text-text-secondary">{label}</span>
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
      className={`flex min-h-20 flex-col items-start justify-center rounded-md border p-4 text-left ${active ? "border-action-primary bg-surface-accent-subtle" : "border-border-subtle"}`}
    >
      {icon}
      <strong className="mt-2 text-subheadline">{label}</strong>
    </button>
  );
}

type ConfirmedSlot = {
  time: string;
  endTime: string;
  accessFrom: string;
  accessTo: string;
};

/** Hora local da unidade. O horário mostrado tem que ser o do prédio. */
function clockLabel(instant: Date, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instant);
}

/**
 * Dia retomado do endereço, quando ele ainda faz sentido.
 *
 * O valor vem da URL e pode estar no passado — basta a pessoa demorar no login
 * e virar o dia. Abrir a grade num dia que não vende nada é pior do que abrir
 * em hoje.
 */
function resumedDay(resumed: string | undefined, today: string) {
  return resumed && resumed >= today ? resumed : today;
}

/** Múltiplo de 30 minutos entre o mínimo da sala e o teto do bloco escolhido. */
function clampDuration(minutes: number, minimum: number, ceiling: number) {
  const top = Math.max(minimum, ceiling);
  return Math.min(Math.max(minutes, minimum), top);
}

