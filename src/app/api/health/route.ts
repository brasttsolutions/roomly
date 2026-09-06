import { integrationMode } from "@/lib/modes";

export const dynamic = "force-static";
export function GET() {
  return Response.json({
    status: "ok",
    service: "roomly",
    integrations: integrationMode(),
  });
}
