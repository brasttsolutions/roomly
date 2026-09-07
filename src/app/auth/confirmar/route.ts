import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { internalPath, signInHref } from "@/lib/redirect";
import { logEvent } from "@/lib/server/logger";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * O fim do cadastro por e-mail.
 *
 * O link da confirmação passa pelo Supabase, que marca o endereço como
 * confirmado e devolve a pessoa para cá com um `code` de uso único. Esta rota
 * era a peça que faltava: sem ela o `code` chegava na home, ninguém o trocava
 * por sessão, e quem tinha acabado de confirmar caía numa página deslogada,
 * sem sinal nenhum de que a conta já existia.
 *
 * `proximo` é o mesmo destino do login — a sala em que a reserva começou — e
 * passa pela mesma conferência, porque ele viaja dentro de um link de e-mail,
 * que é justamente onde um endereço forjado teria mais chance de ser clicado.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const destination = internalPath(searchParams.get("proximo"));

  if (integrationMode() !== "supabase") redirect(destination);

  // O Supabase recusou antes de chegar aqui: link já usado, expirado ou de um
  // endereço que não está na lista de redirecionamentos permitidas.
  const recusa = searchParams.get("error_description") ?? searchParams.get("error");
  if (recusa) {
    logEvent("warn", "auth.confirm_rejected", {
      errorCode: searchParams.get("error_code"),
    });
    redirect(`${signInHref(destination)}&erro=confirmacao-invalida`);
  }

  // O Supabase devolve a confirmação em mais de um formato, e qual deles chega
  // depende de como o cadastro começou e de qual modelo de e-mail o projeto
  // usa. Os dois que o servidor consegue ler são tratados aqui.
  const supabase = await createSupabaseServerClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type");

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash
      ? await supabase.auth.verifyOtp({
          type: (tipo as "signup" | "email" | "recovery") ?? "signup",
          token_hash: tokenHash,
        })
      : { error: null };

  if (error) {
    logEvent("warn", "auth.confirm_failed", {
      errorCode: error.code,
      status: error.status,
      formato: code ? "code" : "token_hash",
    });
    redirect(`${signInHref(destination)}&erro=confirmacao-invalida`);
  }
  if (!code && !tokenHash) {
    // Terceiro formato: o Supabase manda a sessão no fragmento da URL, que o
    // navegador nunca envia ao servidor. Daqui não dá para ler — mas, quando
    // ele chega assim, o endereço JÁ foi confirmado do lado do Supabase, e a
    // pessoa só precisa entrar. Quem explica isso é a tela de login, que
    // enxerga o fragmento.
    logEvent("info", "auth.confirm_sem_parametro", {});
    redirect(`${signInHref(destination)}&erro=confirmacao-invalida`);
  }

  logEvent("info", "auth.confirmed", { formato: code ? "code" : "token_hash" });
  redirect(destination);
}
