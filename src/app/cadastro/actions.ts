"use server";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const signupSchema = z.object({
  invitation: z.string().min(32).max(200),
  name: z.string().trim().min(2).max(120),
  email: z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
});

export async function signUp(formData: FormData) {
  const parsed = signupSchema.safeParse({
    invitation: formData.get("invitation"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/cadastro?erro=dados-invalidos");
  if (integrationMode() === "simulator") redirect("/minhas-reservas");

  const admin = createSupabaseAdminClient();
  const tokenHash = createHash("sha256")
    .update(parsed.data.invitation)
    .digest("hex");
  const { data: invitation } = await admin
    .from("company_invitations")
    .select("email,expires_at,accepted_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (
    !invitation ||
    invitation.accepted_at ||
    new Date(invitation.expires_at) <= new Date() ||
    invitation.email.toLowerCase() !== parsed.data.email
  ) {
    redirect("/cadastro?erro=convite-invalido");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.name,
        invitation_token: parsed.data.invitation,
      },
    },
  });
  if (error) redirect("/cadastro?erro=cadastro-falhou");
  if (data.session) {
    const accepted = await supabase.rpc("accept_company_invitation", {
      target_token: parsed.data.invitation,
      target_name: parsed.data.name,
    });
    if (accepted.error) redirect("/cadastro?erro=convite-invalido");
    await admin.auth.admin.updateUserById(data.user!.id, {
      user_metadata: { full_name: parsed.data.name },
    });
    redirect("/minhas-reservas");
  }
  redirect("/entrar?cadastro=confirme-email");
}
