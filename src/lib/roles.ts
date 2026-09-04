export type MemberRole =
  | "customer"
  | "employee"
  | "manager"
  | "admin"
  | "super_admin";

const labels: Record<MemberRole, string> = {
  customer: "Cliente",
  employee: "Operação",
  manager: "Gerente",
  admin: "Administrador",
  super_admin: "Administrador geral",
};

export const roleLabel = (role: MemberRole) => labels[role] ?? "Cliente";
