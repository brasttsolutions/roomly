"use client";
import { KeyRound, Lock, ShieldOff, TriangleAlert } from "lucide-react";
import { credentialState, type AccessStatus } from "@/modules/access/credential";
import { cn } from "@/lib/utils";

export type CredentialProps = {
  status: AccessStatus | null;
  validFrom: string | null;
  validUntil: string | null;
  /** Impressão digital devolvida pela fechadura, do tipo `••• 921`. */
  fingerprint: string | null;
  roomName: string;
  timeZone: string;
  /** Referência para quem precisar abrir chamado sobre esta reserva. */
  bookingId: string;
  className?: string;
};

/**
 * O momento de maior valor do produto — e por isso o que mais precisa ser
 * verdadeiro. O código completo nunca é armazenado: a fechadura devolve só a
 * impressão digital mascarada, e é ela que aparece aqui. Um número inventado
 * levaria o cliente à porta com a certeza errada.
 */
export function AccessCredentialCard(props: CredentialProps) {
  const {
    status,
    validFrom,
    validUntil,
    fingerprint,
    roomName,
    timeZone,
    bookingId,
    className,
  } = props;
  const state = credentialState({
    status,
    validFrom,
    validUntil,
    now: new Date(),
  });
  const from = validFrom ? clock(validFrom, timeZone) : "--:--";
  const until = validUntil ? clock(validUntil, timeZone) : "--:--";

  const shell = cn(
    "rounded-xl p-6",
    state === "revoked" || state === "failed"
      ? "border border-danger-border bg-danger-surface text-danger-text"
      : "bg-surface-inverse text-white",
    className,
  );

  if (state === "absent") {
    return (
      <section aria-label="Código de acesso" className={shell}>
        <Header icon={<Lock size={17} />} />
        <p className="mt-4 text-subheadline leading-6 text-white/70">
          O acesso é liberado depois da confirmação do pagamento.
        </p>
      </section>
    );
  }

  if (state === "revoked") {
    return (
      <section aria-label="Código de acesso" className={shell}>
        <Header icon={<ShieldOff size={17} />} tone="danger" />
        <p className="mt-4 text-subheadline font-semibold leading-6">
          Acesso revogado — reserva cancelada.
        </p>
        <p className="mt-2 text-subheadline leading-6">
          O código não abre mais a porta da {roomName}.
        </p>
      </section>
    );
  }

  if (state === "failed") {
    return (
      <section aria-label="Código de acesso" className={shell}>
        <Header icon={<TriangleAlert size={17} />} tone="danger" />
        <p className="mt-4 text-subheadline font-semibold leading-6">
          Não conseguimos liberar o acesso.
        </p>
        <p className="mt-2 text-subheadline leading-6">
          Nossa equipe já foi avisada. Procure a recepção da unidade e informe a
          reserva <span className="font-mono">{bookingId.slice(0, 8)}</span>.
        </p>
      </section>
    );
  }

  if (state === "locked") {
    return (
      <section aria-label="Código de acesso" className={shell}>
        <Header icon={<Lock size={17} />} />
        <p className="mt-4 text-subheadline leading-6 text-white/70">
          Seu código aparece 5 minutos antes, às{" "}
          <strong className="text-white">{from}</strong>.
        </p>
        <p className="mt-3 text-caption text-white/50">
          {roomName}
        </p>
      </section>
    );
  }

  const expired = state === "expired";
  return (
    <section aria-label="Código de acesso" className={shell}>
      <Header icon={<KeyRound size={17} />} />
      <p
        // Soletrado dígito a dígito: "quinhentos e oitenta e três mil" não
        // ajuda ninguém diante de um teclado de porta.
        aria-label={`Código de acesso: ${spellOut(fingerprint)}`}
        className={cn(
          "mt-4 font-mono text-headline font-bold tabular-nums",
          expired && "text-white/40 line-through",
        )}
      >
        {fingerprint ?? "•••"}
      </p>
      <p className="mt-3 text-subheadline leading-6 text-white/65">
        {expired ? `Expirou às ${until}` : `Válido das ${from} às ${until}`}
      </p>
      {!expired && (
        <p className="mt-3 rounded-md bg-white/10 p-3 text-caption leading-5 text-white/70">
          Os dígitos completos chegam por e-mail e mensagem. O Roomly guarda
          apenas o final do código.
        </p>
      )}
      <p className="mt-3 text-caption text-white/50">
        {roomName}
      </p>
    </section>
  );
}

function Header({
  icon,
  tone = "inverse",
}: {
  icon: React.ReactNode;
  tone?: "inverse" | "danger";
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 text-caption font-bold uppercase tracking-wide",
        tone === "danger" ? "text-danger-text" : "text-white/70",
      )}
    >
      <span aria-hidden="true">{icon}</span>
      Código de acesso
    </p>
  );
}

/** "••• 921" vira "9 2 1" para o leitor de tela soletrar. */
function spellOut(fingerprint: string | null) {
  if (!fingerprint) return "indisponível";
  return fingerprint.replace(/\d/g, (digit) => `${digit} `).trim();
}

const clock = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
