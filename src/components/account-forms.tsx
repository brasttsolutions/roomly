"use client";
import { useActionState } from "react";
import { Check, KeyRound, Save } from "lucide-react";
import {
  changePassword,
  updateAccount,
  type AccountState,
} from "@/app/conta/actions";
import { Button } from "./ui/button";

export function AccountForm({
  name,
  phone,
}: {
  name: string;
  phone: string;
}) {
  const [state, action, pending] = useActionState<AccountState, FormData>(
    updateAccount,
    { ok: false },
  );
  return (
    <form action={action} className="grid gap-4">
      <Field label="Nome" name="name" defaultValue={name} required />
      <Field
        label="Telefone"
        name="phone"
        defaultValue={phone}
        placeholder="(47) 90000-0000"
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} data-testid="save-account">
          <Save size={17} />
          {pending ? "Salvando..." : "Salvar alterações"}
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(
    changePassword,
    { ok: false },
  );
  return (
    <form action={action} className="grid gap-4">
      <Field
        label="Nova senha"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={10}
        required
      />
      <Field
        label="Confirme a nova senha"
        name="confirmation"
        type="password"
        autoComplete="new-password"
        minLength={10}
        required
      />
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>
          <KeyRound size={17} />
          {pending ? "Alterando..." : "Alterar senha"}
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

function Feedback({ state }: { state: AccountState }) {
  if (state.error)
    return (
      <p role="alert" className="text-sm font-semibold text-[#a84331]">
        {state.error}
      </p>
    );
  if (state.ok && state.message)
    return (
      <p
        role="status"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#176b4d]"
      >
        <Check size={16} />
        {state.message}
      </p>
    );
  return null;
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <input
        {...props}
        className="mt-2 h-11 w-full rounded-md border border-[var(--border-control)] px-3 font-normal"
      />
    </label>
  );
}
