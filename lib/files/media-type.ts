import { fileTypeFromBuffer } from "file-type";
import { lookup as lookupMime } from "mime-types";

type InferMediaTypeInput = {
  filename: string;
  declaredMediaType?: string;
  bytes: Uint8Array;
};

export type MediaTypeResolver = {
  infer(input: InferMediaTypeInput): Promise<string>;
};

async function inferMediaType({
  filename,
  declaredMediaType,
  bytes,
}: InferMediaTypeInput): Promise<string> {
  // 1) Prefer magic-number sniffing when possible.
  const ft = await fileTypeFromBuffer(Buffer.from(bytes));
  if (ft?.mime) return ft.mime;

  // 2) If browser provided a meaningful media type, accept it.
  if (
    declaredMediaType &&
    declaredMediaType.length > 0 &&
    declaredMediaType !== "application/octet-stream"
  ) {
    return declaredMediaType;
  }

  // 3) Fallback: extension → mime mapping.
  const byExt = lookupMime(filename);
  if (typeof byExt === "string" && byExt.length > 0) return byExt;

  return "application/octet-stream";
}

export const mediaTypeResolver: MediaTypeResolver = {
  infer: inferMediaType,
};

