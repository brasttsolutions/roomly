import { integrationMode } from "@/lib/modes";

// `force-static` congelava a resposta no momento do build. Publicado, o
// endereço passou a repetir para sempre o modo que valia quando a imagem foi
// construída: dizia `simulator` com o app já falando com o banco de verdade.
// Uma sonda que responde a configuração do build, e não a que está rodando,
// leva ao diagnóstico errado justamente quando alguém está investigando.
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({
    status: "ok",
    service: "roomly",
    integrations: integrationMode(),
  });
}
