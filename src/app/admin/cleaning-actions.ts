"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requestIdentity } from "@/lib/server/identity";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CLEANING_DONE, type CleaningActionState } from "./cleaning-state";

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
    return { ok: true, message: CLEANING_DONE[parsed.data.step] };
  }
  const identity = await requestIdentity();
  // Espelha `is_company_staff` da RLS: equipe avança a fila, cliente não. A
  // política do banco já recusaria a escrita de um cliente, mas toda função
  // `"use server"` é um endpoint público — a checagem de papel não pode viver só
  // no banco.
  if (!identity || identity.role === "customer")
    return { ok: false, error: "Permissão insuficiente." };

  const now = new Date().toISOString();
  const patch =
    parsed.data.step === "assign"
      ? { status: "assigned", assigned_to: identity.profileId, updated_at: now }
      : parsed.data.step === "start"
        ? { status: "in_progress", started_at: now, updated_at: now }
        : { status: "completed", completed_at: now, updated_at: now };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cleaning_requests")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("company_id", identity.companyId)
    .select("id");
  if (error) return { ok: false, error: "Não foi possível atualizar a fila." };
  // Zero linhas: o item não é desta empresa. Dizer "concluída" seria mentir.
  if ((data?.length ?? 0) === 0)
    return { ok: false, error: "Item não encontrado nesta empresa." };

  revalidatePath("/admin/limpeza");
  revalidatePath("/admin");
  return { ok: true, message: CLEANING_DONE[parsed.data.step] };
}
