"use server";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { internalPath, signInHref, signUpHref } from "@/lib/redirect";

const signupSchema = z.object({
  // Vazio é o caso normal: quem aluga sala cria a própria conta. O convite
  // continua existindo para a equipe do coworking, que precisa de empresa e
  // papel — coisas que ninguém escolhe por conta própria.
  invitation: z.string().max(200).optional().default(""),
  name: z.string().trim().min(2).max(120),
  email: z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
});

export async function signUp(formData: FormData) {
  // Mesmo destino de volta do login: quem criou a conta no meio de uma reserva
  // termina na sala, não numa lista de reservas vazia.
  const destination = internalPath(formData.get("redirecionar"));
  const failed = (motivo: string) =>
    `${signUpHref(destination)}&erro=${motivo}`;
  const parsed = signupSchema.safeParse({
    invitation: formData.get("invitation"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect(failed("dados-invalidos"));
  if (integrationMode() === "simulator") redirect(destination);

  if (!parsed.data.invitation)
    return signUpCustomer(parsed.data, destination, failed);

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
    redirect(failed("convite-invalido"));
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
  if (error) redirect(failed("cadastro-falhou"));
  if (data.session) {
    const accepted = await supabase.rpc("accept_company_invitation", {
      target_token: parsed.data.invitation,
      target_name: parsed.data.name,
    });
    if (accepted.error) redirect(failed("convite-invalido"));
    await admin.auth.admin.updateUserById(data.user!.id, {
      user_metadata: { full_name: parsed.data.name },
    });
    redirect(destination);
  }
  redirect(`${signInHref(destination)}&cadastro=confirme-email`);
}

/**
 * Cadastro aberto: nenhuma empresa é escolhida aqui. A linha em `customers`
 * nasce no primeiro acesso autenticado, por `ensure_customer` — que a amarra ao
 * `auth.uid()` e tira o e-mail do token, não deste formulário.
 */
async function signUpCustomer(
  input: { name: string; email: string; password: string },
  destination: string,
  failed: (motivo: string) => string,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.name } },
  });
  if (error) redirect(failed("cadastro-falhou"));
  // Sem sessão significa que o Supabase exige confirmação por e-mail. O destino
  // segue junto: depois de confirmar, a pessoa entra e cai na sala que escolheu.
  if (!data.session)
    redirect(`${signInHref(destination)}&cadastro=confirme-email`);
  redirect(destination);
}
