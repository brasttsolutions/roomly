import "server-only";
import { cache } from "react";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Quem aluga a sala. É separado de `RequestIdentity` de propósito: aquela é a
 * identidade de quem trabalha num coworking — tem empresa e papel —, e esta não
 * tem empresa nenhuma. É o que permite a mesma pessoa reservar em coworkings
 * diferentes com uma conta só, e é o que dispensa o convite: ninguém precisa
 * dizer a que empresa um cliente pertence.
 */
export type RequestCustomer = Readonly<{
  id: string;
  authUserId: string;
  email: string;
  name: string;
  phone: string | null;
}>;

const demoCustomer: RequestCustomer = {
  id: "customer_demo",
  authUserId: "auth_demo",
  email: "cliente@roomly.local",
  name: "Cliente Roomly",
  phone: null,
};

/**
 * Deduplicada por requisição, como a identidade de equipe: cabeçalho, página e
 * carregamento de dados pedem o mesmo cliente.
 *
 * `ensure_customer` cria a linha na primeira vez. Sem convite, é o próprio
 * login que passa a bastar — e a função amarra a linha ao `auth.uid()` de quem
 * chama, com o e-mail vindo do token, não do formulário.
 */
export const requestCustomer = cache(
  async function requestCustomer(): Promise<RequestCustomer | null> {
    if (integrationMode() === "simulator") return demoCustomer;

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.rpc("ensure_customer", {
      target_name: (user.user_metadata?.full_name as string | undefined) ?? null,
    });
    if (error || !data) return null;

    const row = (Array.isArray(data) ? data[0] : data) as {
      id: string;
      auth_user_id: string;
      email: string;
      name: string;
      phone: string | null;
    };
    return {
      id: row.id,
      authUserId: row.auth_user_id,
      email: row.email,
      name: row.name,
      phone: row.phone,
    };
  },
);
