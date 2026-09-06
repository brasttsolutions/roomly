"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Regras de `cancel_booking`, ditas como a pessoa as vê na tela. */
const MOTIVOS: Record<string, string> = {
  booking_not_found: "Reserva não encontrada.",
  booking_access_denied: "Esta reserva não é sua.",
  booking_cannot_be_cancelled:
    "Esta reserva não pode mais ser cancelada. O horário já começou ou ela já foi encerrada.",
};

export async function cancelBookingAction(bookingId: string) {
  if (integrationMode() === "simulator") return { ok: true };
  const parsed = z.uuid().safeParse(bookingId);
  if (!parsed.success) return { ok: false, error: "Reserva inválida." };

  const supabase = await createSupabaseServerClient();
  // Só "existe sessão" é pergunta da fronteira. Quem é dono da reserva quem
  // responde é `cancel_booking`, que desde a virada para marketplace autoriza
  // por `customers`. Repetir a checagem aqui com `requestIdentity` exigia um
  // perfil de equipe do coworking, e quem se cadastrou sem convite não tem
  // perfil nenhum: todo cliente da plataforma ouvia "Autenticação necessária"
  // estando logado.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Autenticação necessária." };

  const { error } = await supabase.rpc("cancel_booking", {
    target_booking_id: parsed.data,
  });
  if (error)
    return {
      ok: false,
      error: MOTIVOS[error.message] ?? "Não foi possível cancelar.",
    };

  revalidatePath("/minhas-reservas");
  return { ok: true };
}
