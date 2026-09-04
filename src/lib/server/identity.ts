import "server-only";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RequestIdentity = Readonly<{
  authUserId: string;
  companyId: string;
  profileId: string;
  email: string;
  name: string;
  role: "customer" | "employee" | "manager" | "admin" | "super_admin";
}>;

const demoIdentity: RequestIdentity = {
  authUserId: "auth_demo",
  companyId: "company_demo",
  profileId: "profile_demo",
  email: "cliente@roomly.local",
  name: "Cliente Roomly",
  role: "customer",
};

export async function requestIdentity(): Promise<RequestIdentity | null> {
  if (integrationMode() === "simulator") return demoIdentity;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id,company_id,role,email,name")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;

  return {
    authUserId: user.id,
    companyId: data.company_id,
    profileId: data.id,
    email: data.email,
    name: data.name,
    role: data.role,
  } as RequestIdentity;
}
