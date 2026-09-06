"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requestCustomer } from "@/lib/server/customer";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AccountState = { ok: boolean; message?: string; error?: string };

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+()\-\s]*$/, "Telefone inválido.")
    .optional(),
});

const passwordSchema = z
  .object({
    password: z.string().min(10).max(128),
    confirmation: z.string().min(10).max(128),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ["confirmation"],
  });

export async function updateAccount(
  _previous: AccountState,
  formData: FormData,
): Promise<AccountState> {
  if (integrationMode() === "simulator") {
    return { ok: true, message: "Cadastro validado no simulador." };
  }
  const customer = await requestCustomer();
  if (!customer) return { ok: false, error: "Sessão expirada." };
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: "Revise os campos." };

  // O perfil só permite leitura pela RLS, então a escrita usa a chave de
  // serviço restrita à linha da própria sessão: nem o identificador do perfil
  // nem o da empresa vêm do formulário.
  const { error } = await createSupabaseAdminClient()
    .from("customers")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customer.id);
  if (error) return { ok: false, error: "Não foi possível salvar." };
  revalidatePath("/conta");
  return { ok: true, message: "Dados atualizados." };
}

export async function changePassword(
  _previous: AccountState,
  formData: FormData,
): Promise<AccountState> {
  if (integrationMode() === "simulator") {
    return { ok: true, message: "Senha validada no simulador." };
  }
  const customer = await requestCustomer();
  if (!customer) return { ok: false, error: "Sessão expirada." };
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "As senhas precisam coincidir e ter ao menos 10 caracteres.",
    };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: "Não foi possível alterar a senha." };
  return { ok: true, message: "Senha alterada." };
}
