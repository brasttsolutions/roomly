import "server-only";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requestIdentity, type RequestIdentity } from "./identity";

export type AccountView = Readonly<{
  identity: RequestIdentity;
  phone: string;
  company: string;
}>;

export async function accountView(): Promise<AccountView | null> {
  const identity = await requestIdentity();
  if (!identity) return null;
  if (integrationMode() === "simulator") {
    return { identity, phone: "", company: "Roomly (simulador)" };
  }
  const supabase = await createSupabaseServerClient();
  const [profile, company] = await Promise.all([
    supabase.from("profiles").select("phone").eq("id", identity.profileId).maybeSingle(),
    supabase
      .from("companies")
      .select("name")
      .eq("id", identity.companyId)
      .maybeSingle(),
  ]);
  return {
    identity,
    phone: profile.data?.phone ?? "",
    company: company.data?.name ?? "Empresa",
  };
}
