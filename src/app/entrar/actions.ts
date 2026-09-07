"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { internalPath, signInHref } from "@/lib/redirect";

const credentialsSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
});

export async function signIn(formData: FormData) {
  // Para onde voltar depois de entrar. Quem foi barrado no meio de uma reserva
  // volta para a sala, com o horário; quem entrou pela porta da frente segue
  // para as reservas, como sempre.
  const destination = internalPath(formData.get("redirecionar"));
  const failed = `${signInHref(destination)}&erro=credenciais-invalidas`;
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect(failed);
  if (integrationMode() === "simulator") redirect(destination);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect(failed);
  const invitation = data.user.user_metadata.invitation_token;
  const name = data.user.user_metadata.full_name;
  if (typeof invitation === "string" && typeof name === "string") {
    const accepted = await supabase.rpc("accept_company_invitation", {
      target_token: invitation,
      target_name: name,
    });
    if (!accepted.error) {
      await createSupabaseAdminClient().auth.admin.updateUserById(
        data.user.id,
        {
          user_metadata: { full_name: name },
        },
      );
    }
  }
  redirect(destination);
}

export async function signOut() {
  if (integrationMode() === "supabase") {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function signOutEverywhere() {
  if (integrationMode() === "supabase") {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut({ scope: "global" });
  }
  redirect("/");
}
