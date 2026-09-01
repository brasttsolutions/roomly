"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const credentialsSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
});

export async function signIn(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/entrar?erro=credenciais-invalidas");
  if (integrationMode() === "simulator") redirect("/minhas-reservas");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/entrar?erro=credenciais-invalidas");
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
  redirect("/minhas-reservas");
}

export async function signOut() {
  if (integrationMode() === "supabase") {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
