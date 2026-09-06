"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requestIdentity } from "@/lib/server/identity";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { integrationMode } from "@/lib/supabase/config";
import type { CompanyFormState } from "./company-state";

const MANAGERS = ["manager", "admin", "super_admin"];

const schema = z.object({
  description: z.string().trim().max(1000),
  // Vazio limpa o campo; a coluna aceita nulo e o perfil simplesmente não mostra
  // a seção. Guardar string vazia faria o link aparecer apontando para lugar
  // nenhum.
  websiteUrl: z.union([z.literal(""), z.url().max(300)]),
  logoUrl: z.union([z.literal(""), z.url().max(500)]),
  cleaningContactPhone: z.string().trim().max(20),
});

/**
 * `companies` só tem política de leitura, então a escrita usa a chave de
 * serviço presa ao `companyId` da sessão: o identificador da empresa nunca vem
 * do formulário, senão bastaria trocá-lo no navegador para editar o perfil de
 * outro coworking.
 */
export async function updateCompanyProfile(
  _previous: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  if (integrationMode() === "simulator")
    return { ok: true, message: "Salvo no simulador." };

  const identity = await requestIdentity();
  if (!identity || !MANAGERS.includes(identity.role))
    return { ok: false, error: "Só um gestor edita o perfil do coworking." };

  const parsed = schema.safeParse({
    description: formData.get("description"),
    websiteUrl: formData.get("websiteUrl"),
    logoUrl: formData.get("logoUrl"),
    cleaningContactPhone: formData.get("cleaningContactPhone"),
  });
  if (!parsed.success)
    return {
      ok: false,
      error:
        "Confira os endereços: o site precisa começar com http:// ou https://, e o logo com https://.",
    };

  const { error } = await createSupabaseAdminClient()
    .from("companies")
    .update({
      description: parsed.data.description || null,
      website_url: parsed.data.websiteUrl || null,
      logo_url: parsed.data.logoUrl || null,
      cleaning_contact_phone: parsed.data.cleaningContactPhone || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", identity.companyId);
  // O banco recusa logo em http e telefone fora do formato; a mensagem repete a
  // regra em vez de mostrar o código do Postgres.
  if (error)
    return {
      ok: false,
      error:
        "Não foi possível salvar. O logo precisa ser https:// e o telefone ter só números, espaços, parênteses ou hífen.",
    };

  revalidatePath("/admin/configuracoes");
  revalidatePath("/coworkings", "layout");
  return { ok: true, message: "Perfil do coworking atualizado." };
}
