import "server-only";
import { randomUUID } from "node:crypto";

export function requestId(request: Request) {
  return (
    request.headers.get("x-request-id")?.slice(0, 100) ??
    `req_${randomUUID().replaceAll("-", "").slice(0, 16)}`
  );
}
export function json(data: unknown, status: number, id: string) {
  return Response.json(data, {
    status,
    headers: { "x-request-id": id, "cache-control": "no-store" },
  });
}
export function clientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "local";
}

const windows = new Map<string, { count: number; resetAt: number }>();
export function rateLimit(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
