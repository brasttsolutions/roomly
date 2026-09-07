"use server";
import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requestIdentity } from "@/lib/server/identity";
import { cleaningNoticeOffset } from "@/modules/cleaning/notice";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendInvitationEmail } from "@/integrations/resend";
import { appBaseUrl, appBaseUrlIsPublic } from "@/lib/app-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  invalidImage,
  randomStockImage,
  replaceRoomImages,
  uploadRoomImages,
} from "@/lib/server/room-images";

const INVITE_REASON: Record<string, string> = {
  simulator: "provedor em simulador",
  provider_error: "falha no provedor",
  local_app_url: "NEXT_PUBLIC_APP_URL aponta para esta máquina",
};

export type AdminActionState = {
  ok: boolean;
  message?: string;
  /** `warning` quando deu certo mas exige uma ação de quem está na tela. */
  tone?: "success" | "warning";
  error?: string;
};

const postgresUuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const unitSchema = z.object({
  resource: z.literal("unidades"),
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(5).max(240),
  city: z.string().trim().min(2).max(120),
  state: z
    .string()
    .trim()
    .length(2)
    .transform((value) => value.toUpperCase()),
  zipCode: z.string().trim().min(8).max(10),
});
const checkbox = z.literal("on").optional();
const roomSchema = z.object({
  resource: z.literal("salas"),
  locationId: postgresUuid,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(1000),
  capacity: z.coerce.number().int().min(1).max(100),
  hourlyPriceCents: z.coerce.number().int().min(0).max(10_000_000),
  // Minutos e direção chegam separados porque é assim que se lê na tela, e
  // viram um inteiro com sinal porque é assim que a regra existe: dois campos
  // no banco permitiriam gravar "-30 minutos depois".
  cleaningNoticeMinutes: z.coerce.number().int().min(0).max(240).default(0),
  cleaningNoticeWhen: z.enum(["antes", "fim", "depois"]).default("fim"),
  randomImages: checkbox,
  hasCamera: checkbox,
  // Campos descritivos do espaço. Todos opcionais: campo em branco no formulário
  // vira nulo/false no banco, sem obrigar o dono a preencher tudo de uma vez.
  sizeSqm: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().positive().max(10000).optional(),
  ),
  hasWifi: checkbox,
  hasAirConditioning: checkbox,
  hasCoffee: checkbox,
  hasParking: checkbox,
  mapUrl: z
    .union([z.literal(""), z.url({ protocol: /^https?$/ }).max(500)])
    .optional()
    .default(""),
  arrivalInstructions: z.string().trim().max(2000).optional().default(""),
});

/** Colunas descritivas do espaço, iguais na criação e na edição da sala. */
function amenityColumns(d: {
  sizeSqm?: number;
  hasWifi?: "on";
  hasAirConditioning?: "on";
  hasCoffee?: "on";
  hasParking?: "on";
  mapUrl?: string;
  arrivalInstructions?: string;
}) {
  return {
    size_sqm: d.sizeSqm ?? null,
    has_wifi: d.hasWifi === "on",
    has_air_conditioning: d.hasAirConditioning === "on",
    has_coffee: d.hasCoffee === "on",
    has_parking: d.hasParking === "on",
    map_url: d.mapUrl ? d.mapUrl : null,
    arrival_instructions: d.arrivalInstructions ? d.arrivalInstructions : null,
  };
}

const lockSchema = z.object({
  resource: z.literal("fechaduras"),
  roomId: postgresUuid,
  name: z.string().trim().min(2).max(120),
  externalLockId: z.string().trim().min(2).max(200),
  gatewayId: z.string().trim().max(200).optional(),
});
const invitationSchema = z.object({
  resource: z.literal("clientes"),
  email: z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  role: z.enum(["customer", "employee", "manager", "admin"]),
});

const statusSchema = z.enum(["active", "inactive"]);
const editSchema = z.discriminatedUnion("resource", [
  unitSchema.omit({ resource: true }).extend({
    resource: z.literal("unidades"),
    id: postgresUuid,
    status: statusSchema,
  }),
  roomSchema.omit({ resource: true }).extend({
    resource: z.literal("salas"),
    id: postgresUuid,
    status: statusSchema,
  }),
  lockSchema.omit({ resource: true }).extend({
    resource: z.literal("fechaduras"),
    id: postgresUuid,
  }),
]);

export async function updateAdminResource(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (integrationMode() === "simulator") {
    return { ok: true, message: "Alteração validada no simulador." };
  }
  const identity = await requestIdentity();
  if (
    !identity ||
    !["manager", "admin", "super_admin"].includes(identity.role)
  ) {
    return { ok: false, error: "Permissão insuficiente." };
  }
  const parsed = editSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Revise os campos." };

  // A empresa vem da sessão: a RLS recusa alcançar registro de outro inquilino.
  const supabase = await createSupabaseServerClient();
  let error: { message: string } | null = null;
  // Linhas efetivamente alteradas. Um UPDATE que casa zero linhas — porque o id
  // é de outro coworking ou a RLS recusou — devolve `error: null`. Sem contar as
  // linhas, isso virava "Alterações salvas" sem nada ter sido salvo: negação de
  // autorização indistinguível de sucesso. Por isso todo UPDATE pede `.select()`.
  let affected: number | null = null;

  if (parsed.data.resource === "unidades") {
    const result = await supabase
      .from("locations")
      .update({
        name: parsed.data.name,
        address: parsed.data.address,
        city: parsed.data.city,
        state: parsed.data.state,
        zip_code: parsed.data.zipCode,
        status: parsed.data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.id)
      .eq("company_id", identity.companyId)
      .select("id");
    error = result.error;
    affected = result.data?.length ?? 0;
  } else if (parsed.data.resource === "salas") {
    const automatic = parsed.data.randomImages === "on";
    const files = formData
      .getAll("photos")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (!automatic && files.length > 0) {
      const problem = invalidImage(files);
      if (problem) return { ok: false, error: problem };
    }
    const result = await supabase
      .from("rooms")
      .update({
        location_id: parsed.data.locationId,
        name: parsed.data.name,
        slug: slugify(parsed.data.name),
        description: parsed.data.description,
        capacity: parsed.data.capacity,
        hourly_price_cents: parsed.data.hourlyPriceCents,
        cleaning_notice_offset_minutes: cleaningNoticeOffset(parsed.data),
        ...amenityColumns(parsed.data),
        status: parsed.data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.id)
      .eq("company_id", identity.companyId)
      .select("id");
    error = result.error;
    affected = result.data?.length ?? 0;
    if (!error && affected > 0) {
      try {
        if (automatic) {
          await replaceRoomImages({
            companyId: identity.companyId,
            roomId: parsed.data.id,
            urls: [randomStockImage()],
          });
        } else if (files.length > 0) {
          const urls = await uploadRoomImages({
            companyId: identity.companyId,
            roomId: parsed.data.id,
            files,
          });
          await replaceRoomImages({
            companyId: identity.companyId,
            roomId: parsed.data.id,
            urls,
          });
        }
        await setCameraFeature(
          identity.companyId,
          parsed.data.id,
          parsed.data.hasCamera === "on",
        );
      } catch {
        return { ok: false, error: "Sala salva, mas as fotos falharam." };
      }
    }
  } else {
    const result = await supabase
      .from("locks")
      .update({
        room_id: parsed.data.roomId,
        name: parsed.data.name,
        external_lock_id: parsed.data.externalLockId,
        gateway_id: parsed.data.gatewayId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.id)
      .eq("company_id", identity.companyId)
      .select("id");
    error = result.error;
    affected = result.data?.length ?? 0;
  }

  if (error) return { ok: false, error: "Não foi possível salvar." };
  // Nenhuma linha alterada: o registro não é desta empresa, ou não existe.
  if (affected === 0)
    return { ok: false, error: "Registro não encontrado nesta empresa." };
  revalidatePath(`/admin/${parsed.data.resource}`);
  return { ok: true, message: "Alterações salvas." };
}

export async function createAdminResource(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (integrationMode() === "simulator") {
    return { ok: true, message: "Cadastro validado no simulador." };
  }
  const identity = await requestIdentity();
  if (
    !identity ||
    !["manager", "admin", "super_admin"].includes(identity.role)
  ) {
    return { ok: false, error: "Permissão insuficiente." };
  }
  const raw = Object.fromEntries(formData);
  const resource = formData.get("resource");
  const schema =
    resource === "unidades"
      ? unitSchema
      : resource === "salas"
        ? roomSchema
        : resource === "fechaduras"
          ? lockSchema
          : resource === "clientes"
            ? invitationSchema
            : null;
  const parsed = schema?.safeParse(raw);
  if (!parsed?.success) return { ok: false, error: "Revise os campos." };
  if (
    parsed.data.resource === "clientes" &&
    ((parsed.data.role === "manager" && identity.role === "manager") ||
      (parsed.data.role === "admin" && identity.role !== "super_admin"))
  ) {
    return { ok: false, error: "Você não pode conceder esse papel." };
  }
  const supabase = await createSupabaseServerClient();
  let error: { message: string } | null = null;
  if (parsed.data.resource === "unidades") {
    ({ error } = await supabase.from("locations").insert({
      company_id: identity.companyId,
      name: parsed.data.name,
      address: parsed.data.address,
      city: parsed.data.city,
      state: parsed.data.state,
      zip_code: parsed.data.zipCode,
    }));
  } else if (parsed.data.resource === "salas") {
    const automatic = parsed.data.randomImages === "on";
    const files = automatic
      ? []
      : formData.getAll("photos").filter((entry): entry is File => {
          return entry instanceof File && entry.size > 0;
        });
    if (!automatic) {
      const problem = invalidImage(files);
      if (problem) return { ok: false, error: problem };
    }
    const created = await supabase
      .from("rooms")
      .insert({
        company_id: identity.companyId,
        location_id: parsed.data.locationId,
        name: parsed.data.name,
        slug: slugify(parsed.data.name),
        description: parsed.data.description,
        capacity: parsed.data.capacity,
        hourly_price_cents: parsed.data.hourlyPriceCents,
        cleaning_notice_offset_minutes: cleaningNoticeOffset(parsed.data),
        ...amenityColumns(parsed.data),
      })
      .select("id")
      .single();
    if (created.error || !created.data) {
      return { ok: false, error: "Não foi possível salvar o cadastro." };
    }
    try {
      const urls = automatic
        ? [randomStockImage()]
        : await uploadRoomImages({
            companyId: identity.companyId,
            roomId: created.data.id,
            files,
          });
      await attachRoomImages(identity.companyId, created.data.id, urls);
      if (parsed.data.hasCamera === "on") {
        await attachCameraFeature(identity.companyId, created.data.id);
      }
    } catch {
      return {
        ok: false,
        error: "Sala criada, mas as imagens não foram salvas. Edite a sala.",
      };
    }
  } else if (parsed.data.resource === "fechaduras") {
    ({ error } = await supabase.from("locks").insert({
      company_id: identity.companyId,
      room_id: parsed.data.roomId,
      provider: "ttlock",
      name: parsed.data.name,
      external_lock_id: parsed.data.externalLockId,
      gateway_id: parsed.data.gatewayId || null,
    }));
  } else {
    const token = randomBytes(32).toString("base64url");
    ({ error } = await supabase.from("company_invitations").insert({
      company_id: identity.companyId,
      email: parsed.data.email,
      role: parsed.data.role,
      token_hash: createHash("sha256").update(token).digest("hex"),
      invited_by: identity.authUserId,
      expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    }));
    if (!error) {
      const invitationUrl = `${appBaseUrl()}/cadastro?convite=${encodeURIComponent(token)}`;
      // Mandar de verdade um link que só abre nesta máquina é pior do que não
      // mandar: quem recebe não tem como saber que o endereço é inútil.
      const delivery = appBaseUrlIsPublic()
        ? await sendInvitationEmail({
            email: parsed.data.email,
            invitationUrl,
            idempotencyKey: createHash("sha256").update(token).digest("hex"),
          })
        : ({ sent: false, reason: "local_app_url" } as const);
      revalidatePath("/admin/clientes");
      // Um endereço solto num aviso verde faz quem convidou acreditar que o
      // e-mail saiu. O convite vale de qualquer forma — o que muda é quem
      // entrega o link.
      return delivery.sent
        ? { ok: true, tone: "success", message: "Convite enviado por e-mail." }
        : {
            ok: true,
            tone: "warning",
            message: `Convite criado, mas o e-mail não foi enviado (${INVITE_REASON[delivery.reason]}). Envie este link a ${parsed.data.email}: ${invitationUrl}`,
          };
    }
  }
  if (error) return { ok: false, error: "Não foi possível salvar o cadastro." };
  revalidatePath(`/admin/${parsed.data.resource}`);
  return { ok: true, message: "Cadastro salvo." };
}

/**
 * `room_images` e `room_feature_relations` só têm política de leitura, então a
 * escrita usa a chave de serviço com a empresa e a sala vindas da sessão.
 */
async function attachRoomImages(
  companyId: string,
  roomId: string,
  urls: string[],
) {
  const { error } = await createSupabaseAdminClient()
    .from("room_images")
    .insert(
      urls.map((url, position) => ({
        company_id: companyId,
        room_id: roomId,
        url,
        position,
      })),
    );
  if (error) throw new Error("room_images_persist_failed");
}

async function setCameraFeature(
  companyId: string,
  roomId: string,
  enabled: boolean,
) {
  if (enabled) return attachCameraFeature(companyId, roomId, true);
  const admin = createSupabaseAdminClient();
  const feature = await admin
    .from("room_features")
    .select("id")
    .eq("name", "Câmera")
    .maybeSingle();
  if (!feature.data) return;
  await admin
    .from("room_feature_relations")
    .delete()
    .eq("company_id", companyId)
    .eq("room_id", roomId)
    .eq("feature_id", feature.data.id);
}

async function attachCameraFeature(
  companyId: string,
  roomId: string,
  ignoreDuplicate = false,
) {
  const admin = createSupabaseAdminClient();
  const feature = await admin
    .from("room_features")
    .upsert({ name: "Câmera" }, { onConflict: "name" })
    .select("id")
    .single();
  if (feature.error || !feature.data) throw new Error("room_feature_failed");
  const { error } = await admin.from("room_feature_relations").upsert(
    {
      company_id: companyId,
      room_id: roomId,
      feature_id: feature.data.id,
    },
    { onConflict: "room_id,feature_id", ignoreDuplicates: ignoreDuplicate },
  );
  if (error) throw new Error("room_feature_relation_failed");
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
