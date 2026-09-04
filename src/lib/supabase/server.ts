import "server-only";
import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabasePublicConfig } from "./config";

/** Um cliente por requisição evita reprocessar cookies e renovar o token à toa. */
export const createSupabaseServerClient = cache(
  async function createSupabaseServerClient() {
    const config = requireSupabasePublicConfig();
    const cookieStore = await cookies();
    return createServerClient(config.url, config.anonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Rendering Server Components cannot write cookies. Actions and
            // Route Handlers refresh the session when mutation is available.
          }
        },
      },
    });
  },
);
