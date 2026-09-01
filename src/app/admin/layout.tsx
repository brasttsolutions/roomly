import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { requestIdentity } from "@/lib/server/identity";
import { integrationMode } from "@/lib/supabase/config";

export default async function Layout({ children }: { children: ReactNode }) {
  if (integrationMode() === "supabase") {
    const identity = await requestIdentity();
    if (!identity || identity.role === "customer") redirect("/");
  }
  return <AdminShell>{children}</AdminShell>;
}
