import type { JSONValue } from "ai";

export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ")
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function isJsonValue(v: unknown, depth = 0): v is JSONValue {
  // Minimal JSONValue validator with depth cap (avoids cycles by not traversing objects too deeply).
  if (depth > 20) return false;
  if (
    v === null ||
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean"
  ) {
    return true;
  }
  if (Array.isArray(v)) {
    return v.every((x) => isJsonValue(x, depth + 1));
  }
  if (isRecord(v)) {
    for (const k of Object.keys(v)) {
      if (!isJsonValue(v[k], depth + 1)) return false;
    }
    return true;
  }
  return false;
}
