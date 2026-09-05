"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requestIdentity } from "@/lib/server/identity";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CleaningActionState = { ok: boolean; error?: string };

const schema = z.object({
  id: z.string().min(1).max(64),
  step: z.enum(["assign", "start", "complete"]),
});

/**
 * Avança um item da fila de limpeza. Cada passo grava o carimbo que a operação
 * usa depois para medir atraso — atribuir sem registrar quem e quando deixaria
 * a fila sem dono.
 */
export async function advanceCleaning(
  _previous: CleaningActionState,
  formData: FormData,
): Promise<CleaningActionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Ação inválida." };
  if (integrationMode() === "simulator") {
    return { ok: true };
  }
  const identity = await requestIdentity();
  if (!identity) return { ok: false, error: "Permissão insuficiente." };

  const now = new Date().toISOString();
  const patch =
    parsed.data.step === "assign"
      ? { status: "assigned", assigned_to: identity.profileId, updated_at: now }
      : parsed.data.step === "start"
        ? { status: "in_progress", started_at: now, updated_at: now }
        : { status: "completed", completed_at: now, updated_at: now };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("cleaning_requests")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("company_id", identity.companyId);
  if (error) return { ok: false, error: "Não foi possível atualizar a fila." };

  revalidatePath("/admin/limpeza");
  revalidatePath("/admin");
  return { ok: true };
}
