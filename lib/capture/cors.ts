const DEFAULT_CAPTURE_ORIGINS = ["https://www.bilibili.com"] as const;

function buildCaptureCorsAllowlist(): Set<string> {
  const fromEnv =
    process.env.CAPTURE_CORS_ALLOWED_ORIGINS?.split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0) ?? [];
  return new Set<string>([...DEFAULT_CAPTURE_ORIGINS, ...fromEnv]);
}

const ALLOWED_ORIGINS = buildCaptureCorsAllowlist();

export function getCaptureCorsHeaders(
  req: Request,
  allowMethods = "POST, OPTIONS",
  allowHeaders = "authorization, content-type"
): HeadersInit {
  const origin = req.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return {};
  }

  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": allowMethods,
    "access-control-allow-headers": allowHeaders,
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

