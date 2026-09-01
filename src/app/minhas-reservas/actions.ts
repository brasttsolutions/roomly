"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requestIdentity } from "@/lib/server/identity";

export async function cancelBookingAction(bookingId: string) {
  if (integrationMode() === "simulator") return { ok: true };
  const parsed = z.uuid().safeParse(bookingId);
  if (!parsed.success) return { ok: false, error: "Reserva inválida." };
  const identity = await requestIdentity();
  if (!identity) return { ok: false, error: "Autenticação necessária." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("cancel_booking", {
    target_booking_id: parsed.data,
  });
  if (error) return { ok: false, error: "Não foi possível cancelar." };
  revalidatePath("/minhas-reservas");
  return { ok: true };
}
