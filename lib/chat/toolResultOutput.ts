import type { ToolResultPart } from "ai";
import { isRecord, isJsonObject, safeStringify } from "@/lib/utils";

export type ToolResultOutput = ToolResultPart["output"];

export function toToolResultOutput(output: unknown): ToolResultOutput {
  if (typeof output === "string") return { type: "text", value: output };
  if (isJsonObject(output)) return { type: "json", value: output };
  return { type: "text", value: safeStringify(output) };
}

export function isToolResultOutput(v: unknown): v is ToolResultOutput {
  if (!isRecord(v)) return false;
  const type = v["type"];
  if (typeof type !== "string") return false;

  if (type === "text" || type === "error-text") {
    return typeof v["value"] === "string";
  }

  if (type === "json" || type === "error-json") {
    return isJsonObject(v["value"]);
  }

  if (type === "execution-denied") {
    return v["reason"] === undefined || typeof v["reason"] === "string";
  }

  if (type === "content") {
    const value = v["value"];
    if (!Array.isArray(value)) return false;
    // We keep this permissive: validate basic shape for known items, ignore providerOptions.
    return value.every((item) => {
      if (!isRecord(item)) return false;
      const t = item["type"];
      if (t === "text") return typeof item["text"] === "string";
      if (t === "media")
        return typeof item["data"] === "string" && typeof item["mediaType"] === "string";
      if (t === "file-data")
        return (
          typeof item["data"] === "string" &&
          typeof item["mediaType"] === "string" &&
          (item["filename"] === undefined || typeof item["filename"] === "string")
        );
      if (t === "file-url") return typeof item["url"] === "string";
      if (t === "file-id")
        return (
          typeof item["fileId"] === "string" ||
          (isRecord(item["fileId"]) &&
            Object.values(item["fileId"]).every((x) => typeof x === "string"))
        );
      if (t === "image-data")
        return typeof item["data"] === "string" && typeof item["mediaType"] === "string";
      if (t === "image-url") return typeof item["url"] === "string";
      if (t === "image-file-id")
        return (
          typeof item["fileId"] === "string" ||
          (isRecord(item["fileId"]) &&
            Object.values(item["fileId"]).every((x) => typeof x === "string"))
        );
      // Unknown custom content parts are rejected for strictness.
      return false;
    });
  }

  return false;
}

