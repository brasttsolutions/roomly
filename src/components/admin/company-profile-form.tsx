"use client";
import { useActionState } from "react";
import { Check, Save, TriangleAlert } from "lucide-react";
import { updateCompanyProfile } from "@/app/admin/company-actions";
import {
  COMPANY_FORM_IDLE,
  type CompanyFormState,
} from "@/app/admin/company-state";
import { Button } from "@/components/ui/button";

export type CompanyProfileValues = {
  name: string;
  slug: string;
  description: string;
  websiteUrl: string;
  logoUrl: string;
  cleaningContactPhone: string;
};

export function CompanyProfileForm({
  values,
  profileHref,
}: {
  values: CompanyProfileValues;
  profileHref: string;
}) {
  const [state, action, pending] = useActionState<CompanyFormState, FormData>(
    updateCompanyProfile,
    COMPANY_FORM_IDLE,
  );
  return (
    <form action={action} className="grid gap-4">
      <p className="text-subheadline text-text-secondary">
        É isto que quem vai alugar vê em{" "}
        <a
          href={profileHref}
          className="font-bold text-text-link hover:underline"
        >
          {values.name}
        </a>
        .
      </p>

      <label className="text-subheadline font-bold">
        Descrição
        <textarea
          name="description"
          rows={4}
          defaultValue={values.description}
          maxLength={1000}
          placeholder="O que a sua operação oferece, em duas ou três frases."
          className="mt-1.5 w-full rounded-md border border-border-control bg-surface-raised p-3 text-subheadline font-normal"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Site"
          name="websiteUrl"
          type="url"
          defaultValue={values.websiteUrl}
          placeholder="https://seucoworking.com.br"
        />
        <Field
          label="Telefone da limpeza"
          name="cleaningContactPhone"
          defaultValue={values.cleaningContactPhone}
          placeholder="(47) 90000-0000"
          hint="Vai junto no aviso automático de limpeza."
        />
      </div>

      <Field
        label="Logo (endereço da imagem)"
        name="logoUrl"
        type="url"
        defaultValue={values.logoUrl}
        placeholder="https://..."
        hint="Precisa ser https. Sem logo, o perfil mostra as iniciais."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} data-testid="save-company">
          <Save size={17} />
          {pending ? "Salvando..." : "Salvar alterações"}
        </Button>
        {state.ok && state.message && (
          <span className="flex items-center gap-1.5 text-subheadline font-semibold text-success-text">
            <Check size={16} aria-hidden="true" />
            {state.message}
          </span>
        )}
        {state.error && (
          <span
            role="alert"
            className="flex items-center gap-1.5 text-subheadline font-semibold text-danger-text"
          >
            <TriangleAlert size={16} aria-hidden="true" />
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="text-subheadline font-bold">
      {label}
      <input
        {...props}
        className="mt-1.5 h-11 w-full rounded-md border border-border-control bg-surface-raised px-3 text-subheadline font-normal"
      />
      {hint && (
        <span className="mt-1 block text-caption font-normal text-text-secondary">
          {hint}
        </span>
      )}
    </label>
  );
}
