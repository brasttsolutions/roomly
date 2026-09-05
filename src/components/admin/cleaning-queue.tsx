"use client";
import { useActionState } from "react";
import { SprayCan } from "lucide-react";
import { advanceCleaning, type CleaningActionState } from "@/app/admin/cleaning-actions";
import type { CleaningTask } from "@/lib/server/admin-views";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

const STEP: Record<
  CleaningTask["status"],
  { label: string; step: "assign" | "start" | "complete" } | null
> = {
  pending: { label: "Atribuir a mim", step: "assign" },
  assigned: { label: "Iniciar", step: "start" },
  in_progress: { label: "Concluir", step: "complete" },
  completed: null,
  cancelled: null,
};

export function CleaningQueue({ tasks }: { tasks: readonly CleaningTask[] }) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<SprayCan size={28} />}
        title="Fila vazia"
        description="Nenhuma sala aguardando preparo agora."
      />
    );
  }
  return (
    <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-surface-raised">
      {tasks.map((task) => (
        <Task key={task.id} task={task} />
      ))}
    </ul>
  );
}

function Task({ task }: { task: CleaningTask }) {
  const [state, action, pending] = useActionState<CleaningActionState, FormData>(
    advanceCleaning,
    { ok: true },
  );
  const next = STEP[task.status];
  return (
    <li className="flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-subheadline">{task.room}</strong>
          <StatusBadge task={task} />
        </div>
        <p className="mt-1 text-caption text-text-secondary">
          Janela {task.window} ·{" "}
          {task.assignee ? `com ${task.assignee}` : "sem responsável"}
        </p>
        {state.error && (
          <Alert tone="danger" className="mt-2">
            {state.error}
          </Alert>
        )}
      </div>
      {next && (
        <form action={action}>
          <input type="hidden" name="id" value={task.id} />
          <input type="hidden" name="step" value={next.step} />
          <Button type="submit" size="sm" loading={pending}>
            {next.label}
          </Button>
        </form>
      )}
    </li>
  );
}

function StatusBadge({ task }: { task: CleaningTask }) {
  // Atraso vem antes do status: uma sala suja há 45 minutos já está bloqueando
  // a próxima reserva, e é isso que precisa saltar.
  if (task.lateMinutes > 0)
    return <Badge tone="danger">Atrasada {task.lateMinutes} min</Badge>;
  if (task.status === "in_progress") return <Badge tone="info">Em limpeza</Badge>;
  if (task.status === "assigned") return <Badge tone="warning">Atribuída</Badge>;
  return <Badge tone="warning">Aguardando</Badge>;
}
