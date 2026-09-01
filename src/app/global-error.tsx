"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="pt-BR">
      <body className="grid min-h-screen place-items-center bg-[#f6f7f4] p-6">
        <main className="max-w-md text-center">
          <h1 className="text-2xl font-bold">
            Não foi possível carregar o Roomly
          </h1>
          <p className="mt-3 text-sm text-[#66736d]">
            A ocorrência foi registrada. Atualize a página para tentar
            novamente.
          </p>
        </main>
      </body>
    </html>
  );
}
