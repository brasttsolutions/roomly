import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { integrationMode } from "@/lib/modes";
import { internalPath, signInHref } from "@/lib/redirect";
import { hardenedCookie } from "@/lib/supabase/cookies";

export async function proxy(request: NextRequest) {
  if (integrationMode() !== "supabase") {
    return NextResponse.next();
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return new NextResponse("Supabase configuration is incomplete.", {
      status: 503,
    });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, hardenedCookie(options)),
        );
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const protectedRoute = [
    "/minhas-reservas",
    "/admin",
    "/conta",
  ].some((route) => request.nextUrl.pathname.startsWith(route));
  if (protectedRoute && !user) {
    // Leva junto de onde a pessoa veio. Sem isto, quem abre o link de uma
    // reserva sem sessão entra e cai na lista, tendo que procurar de novo o que
    // já tinha em mãos.
    const alvo = request.nextUrl.pathname + request.nextUrl.search;
    return NextResponse.redirect(new URL(signInHref(alvo), request.url));
  }
  if (request.nextUrl.pathname === "/entrar" && user) {
    // Já logado, mas com destino no endereço: honra o destino em vez de
    // despejar todo mundo na lista de reservas.
    const destino = internalPath(request.nextUrl.searchParams.get("redirecionar"));
    return NextResponse.redirect(new URL(destino, request.url));
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
