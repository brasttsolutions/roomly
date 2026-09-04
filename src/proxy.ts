import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  if (process.env.ROOMLY_INTEGRATION_MODE !== "supabase") {
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
          response.cookies.set(name, value, options),
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
    return NextResponse.redirect(new URL("/entrar", request.url));
  }
  if (request.nextUrl.pathname === "/entrar" && user) {
    return NextResponse.redirect(new URL("/minhas-reservas", request.url));
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
