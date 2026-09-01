export const dynamic = "force-static";
export function GET() {
  return Response.json({
    status: "ok",
    service: "roomly",
    integrations: process.env.ROOMLY_INTEGRATION_MODE ?? "simulator",
  });
}
