import { z } from "zod";

const publicConfigSchema = z.object({
  url: z.url(),
  anonKey: z.string().min(20),
});

export type IntegrationMode = "simulator" | "supabase";

export function integrationMode(): IntegrationMode {
  return process.env.ROOMLY_INTEGRATION_MODE === "supabase"
    ? "supabase"
    : "simulator";
}

export function supabasePublicConfig() {
  const parsed = publicConfigSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return parsed.success ? parsed.data : null;
}

export function requireSupabasePublicConfig() {
  const config = supabasePublicConfig();
  if (!config) {
    throw new Error(
      "Supabase mode requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return config;
}
