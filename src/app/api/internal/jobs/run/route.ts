import { timingSafeEqual } from "node:crypto";
import { runDueJobs } from "@/lib/server/job-worker";
import { json, requestId } from "@/lib/server/http";
import { integrationMode } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const id = requestId(request);
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  if (!secret || !secureEqual(authorization, `Bearer ${secret}`)) {
    return json({ error: "unauthorized" }, 401, id);
  }
  // Antes isto respondia `{"processed":[]}` com 200, indistinguível de "rodou e
  // não havia nada". Um monitor de cron via sucesso perpétuo enquanto a fila
  // nunca era tocada.
  if (integrationMode() === "simulator")
    return json({ skipped: "simulator", processed: [] }, 200, id);
  try {
    const processed = await runDueJobs(10);
    return json({ processed }, 200, id);
  } catch {
    return json({ error: "worker_unavailable" }, 503, id);
  }
}

function secureEqual(received: string, expected: string) {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
