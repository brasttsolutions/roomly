import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const ROOM_IMAGE_BUCKET = "room-images";
export const ROOM_IMAGE_MAX_FILES = 6;
export const ROOM_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const ROOM_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Fotos de catálogo usadas quando o cadastro pede imagens automáticas. */
const stockImages = [
  "/rooms/executiva.png",
  "/rooms/foco.png",
  "/rooms/atelier.png",
];

export function randomStockImage() {
  return stockImages[Math.floor(Math.random() * stockImages.length)];
}

export function invalidImage(files: File[]) {
  if (files.length < 1 || files.length > ROOM_IMAGE_MAX_FILES) {
    return `Anexe de 1 a ${ROOM_IMAGE_MAX_FILES} imagens.`;
  }
  for (const file of files) {
    if (!ROOM_IMAGE_TYPES.includes(file.type)) {
      return "Formatos aceitos: JPEG, PNG ou WebP.";
    }
    if (file.size > ROOM_IMAGE_MAX_BYTES) {
      return "Cada imagem deve ter no máximo 2 MB.";
    }
  }
  return null;
}

/**
 * Envia as fotos ao Storage e devolve as URLs públicas. O caminho carrega
 * empresa e sala, ambas derivadas da sessão, para que uma empresa nunca escreva
 * na pasta de outra.
 */
export async function uploadRoomImages(input: {
  companyId: string;
  roomId: string;
  files: File[];
}) {
  const storage = createSupabaseAdminClient().storage;
  const { data: bucket } = await storage.getBucket(ROOM_IMAGE_BUCKET);
  if (!bucket) {
    const { error } = await storage.createBucket(ROOM_IMAGE_BUCKET, {
      public: true,
      allowedMimeTypes: ROOM_IMAGE_TYPES,
      fileSizeLimit: ROOM_IMAGE_MAX_BYTES,
    });
    if (error) throw new Error("room_image_bucket_failed");
  }

  const urls: string[] = [];
  for (const [index, file] of input.files.entries()) {
    const extension = file.type.replace("image/", "").replace("jpeg", "jpg");
    const path = `${input.companyId}/${input.roomId}/${index}-${crypto.randomUUID()}.${extension}`;
    const { error } = await storage
      .from(ROOM_IMAGE_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error("room_image_upload_failed");
    urls.push(storage.from(ROOM_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

/**
 * Troca todas as fotos da sala. Remove os arquivos antigos do Storage antes de
 * gravar os novos para não deixar objeto órfão pagando armazenamento.
 */
export async function replaceRoomImages(input: {
  companyId: string;
  roomId: string;
  urls: string[];
}) {
  const admin = createSupabaseAdminClient();
  const { data: current } = await admin
    .from("room_images")
    .select("url")
    .eq("company_id", input.companyId)
    .eq("room_id", input.roomId);

  const marker = `/${ROOM_IMAGE_BUCKET}/`;
  const stored = (current ?? [])
    .map((row) => String(row.url))
    .filter((url) => url.includes(marker))
    .map((url) => url.split(marker)[1]);
  if (stored.length > 0) {
    await admin.storage.from(ROOM_IMAGE_BUCKET).remove(stored);
  }

  const { error: removeError } = await admin
    .from("room_images")
    .delete()
    .eq("company_id", input.companyId)
    .eq("room_id", input.roomId);
  if (removeError) throw new Error("room_images_clear_failed");

  const { error } = await admin.from("room_images").insert(
    input.urls.map((url, position) => ({
      company_id: input.companyId,
      room_id: input.roomId,
      url,
      position,
    })),
  );
  if (error) throw new Error("room_images_persist_failed");
}
