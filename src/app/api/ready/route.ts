import { createClient } from "@supabase/supabase-js";
import { integrationMode, supabasePublicConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const mode = integrationMode();
  if (mode === "simulator") {
    return Response.json({ status: "ready", mode });
  }
  const config = supabasePublicConfig();
  const missing = [
    !config && "supabase_public_config",
    !process.env.SUPABASE_SERVICE_ROLE_KEY && "supabase_service_role",
    process.env.ROOMLY_PAYMENT_MODE === "mercado_pago" &&
      !process.env.MERCADO_PAGO_ACCESS_TOKEN &&
      "mercado_pago_access_token",
    process.env.ROOMLY_PAYMENT_MODE === "mercado_pago" &&
      !process.env.MERCADO_PAGO_WEBHOOK_SECRET &&
      "mercado_pago_webhook_secret",
    !process.env.CRON_SECRET && "cron_secret",
    process.env.ROOMLY_ACCESS_MODE === "ttlock" &&
      "ttlock_physical_poc_not_approved",
    !process.env.N8N_WEBHOOK_URL && "n8n_webhook_url",
    !process.env.N8N_WEBHOOK_SECRET && "n8n_webhook_secret",
    !process.env.RESEND_API_KEY && "resend_api_key",
    !process.env.RESEND_FROM_EMAIL && "resend_from_email",
    process.env.NODE_ENV === "production" &&
      process.env.ROOMLY_ACCESS_MODE !== "ttlock" &&
      "production_access_provider",
  ].filter(Boolean);
  if (missing.length > 0) {
    return Response.json({ status: "not_ready", missing }, { status: 503 });
  }
  const supabase = createClient(config!.url, config!.anonKey, {
    auth: { persistSession: false },
  });
  const { error } = await supabase.from("rooms").select("id").limit(1);
  if (error) {
    return Response.json(
      { status: "not_ready", dependency: "supabase" },
      { status: 503 },
    );
  }
  return Response.json({ status: "ready", mode });
}
