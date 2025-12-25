import { JsonValue } from "@/generated/prisma/internal/prismaNamespace";
import { v4 as uuidv4 } from "uuid";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Checks whether a value is a non-null JSON object (and not an array).
 *
 * Note: This is intentionally stricter than Prisma's JsonValue type, because
 * callers only need to treat plain objects as "json" for UI rendering/storage.
 */
export function isJsonObject(value: unknown): value is JsonValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function safeStringify(value: unknown): string {
  if (typeof value === "string") return value;
  if (isJsonObject(value)) return JSON.stringify(value);
  return String(value);
}

export function generateUUID(): string {
  return uuidv4();
}