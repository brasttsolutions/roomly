import "server-only";

type LogLevel = "info" | "warn" | "error";
type Context = Record<string, unknown>;

const sensitiveKey = /password|secret|token|authorization|code|card/i;

function sanitize(context: Context) {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      sensitiveKey.test(key) ? "[redacted]" : value,
    ]),
  );
}

export function logEvent(
  level: LogLevel,
  event: string,
  context: Context = {},
) {
  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitize(context),
  });
  if (level === "error") console.error(record);
  else if (level === "warn") console.warn(record);
  else console.info(record);
}
