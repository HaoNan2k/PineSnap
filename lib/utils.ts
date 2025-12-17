import { JsonValue } from "@/generated/prisma/internal/prismaNamespace";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isJsonValue(value: unknown): value is JsonValue {
  return typeof value === "object" && value !== null && !Array.isArray(value) && value !== undefined;
}

export function safeStringify(value: unknown): string {
  if (typeof value === "string") return value;
  if (isJsonValue(value)) return JSON.stringify(value);
  return String(value);
}