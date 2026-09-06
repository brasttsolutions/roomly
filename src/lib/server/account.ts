import "server-only";
import { integrationMode } from "@/lib/supabase/config";
import { requestCustomer, type RequestCustomer } from "./customer";

export type AccountView = Readonly<{
  customer: RequestCustomer;
  phone: string;
}>;

export async function accountView(): Promise<AccountView | null> {
  const customer = await requestCustomer();
  if (!customer) return null;
  // A empresa saiu daqui de propósito: o cliente é da plataforma, não de um
  // coworking, e mostrar uma empresa seria inventar um vínculo que não existe.
  if (integrationMode() === "simulator") return { customer, phone: "" };
  return { customer, phone: customer.phone ?? "" };
}
