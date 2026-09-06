import "server-only";

type LogLevel = "info" | "warn" | "error";
type Context = Record<string, unknown>;

// `code` solto continua protegido, porque é assim que um código de fechadura
// apareceria num log. Mas `code` como pedaço de qualquer nome apagava também o
// `code` do worker, que é a classificação do erro: toda falha de job virava a
// linha `"code":"[redacted]"`, e a única informação que a linha existia para
// carregar era justamente essa.
const sensitiveKey =
  /password|secret|token|authorization|card|access_?code|^code$/i;

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
