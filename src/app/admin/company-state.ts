/**
 * Fora do arquivo `"use server"`: ele só pode exportar funções assíncronas, e o
 * estado inicial precisa ser importável pelo formulário.
 */
export type CompanyFormState = {
  ok: boolean;
  message?: string;
  error?: string;
};

export const COMPANY_FORM_IDLE: CompanyFormState = { ok: false };
