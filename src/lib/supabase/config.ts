import { z } from "zod";
import { integrationMode } from "@/lib/modes";

const publicConfigSchema = z.object({
  url: z.url(),
  anonKey: z.string().min(20),
});

// O modo mora em `@/lib/modes` junto dos outros dois; segue exportado daqui
// porque é por aqui que o resto do produto sempre o pediu.
export { integrationMode };
export type { IntegrationMode } from "@/lib/modes";

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
