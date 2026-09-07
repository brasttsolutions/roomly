"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/server/logger";

const schema = z.object({ password: z.string().min(10).max(128) });

/**
 * Grava a nova senha. Só funciona com a sessão de recuperação já estabelecida
 * pelo link do e-mail — `updateUser` exige a sessão, então não há como redefinir
 * a senha de outra pessoa sem ter aberto o link dela.
 */
export async function setNewPassword(formData: FormData) {
  const parsed = schema.safeParse({ password: formData.get("password") });
  if (!parsed.success) redirect("/redefinir?erro=senha-curta");
  if (integrationMode() === "simulator") redirect("/minhas-reservas");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Sem sessão de recuperação não há o que redefinir: o link venceu ou já foi
  // usado. Manda de volta pedir outro, sem fingir que deu certo.
  if (!user) redirect("/redefinir?erro=sessao-expirada");

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    logEvent("warn", "password_reset.update_failed", {
      errorCode: error.code,
      status: error.status,
    });
    // Senha igual à anterior é o motivo comum; o resto é genérico.
    redirect("/redefinir?erro=nao-alterou");
  }
  redirect("/minhas-reservas");
}
