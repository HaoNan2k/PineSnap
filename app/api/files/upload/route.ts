import { fileStorage } from "@/lib/storage";
import { mediaTypeResolver } from "@/lib/files/media-type";
import { logError } from "@/lib/logger";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";

function getTtlSeconds(): number {
  const raw = Number(process.env.SUPABASE_SIGNED_URL_TTL_SECONDS ?? "300");
  if (!Number.isFinite(raw) || raw <= 0) return 300;
  return raw;
}

function getAllowedMediaTypes(): string[] {
  const raw = process.env.FILE_UPLOAD_ALLOWED_MEDIA_TYPES;
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  // Minimal safe defaults:
  // - images: allow bytes-first prompt hydration
  // - text-like: allow prompt injection via bounded extraction
  // - pdf: commonly shared, stored for replay (not hydrated into prompt)
  return [
    "image/*",
    "text/*",
    "application/json",
    "application/xml",
    "application/x-yaml",
    "application/pdf",
  ];
}

function isAllowedMediaType(mediaType: string, allowlist: string[]): boolean {
  if (mediaType === "application/octet-stream") return false;
  for (const allowed of allowlist) {
    if (allowed.endsWith("/*")) {
      const prefix = allowed.slice(0, -1); // keep trailing '/'
      if (mediaType.startsWith(prefix)) return true;
    } else if (mediaType === allowed) {
      return true;
    }
  }
  return false;
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Basic validation
    if (file.size > 5 * 1024 * 1024) {
      return Response.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mediaType = await mediaTypeResolver.infer({
      filename: file.name,
      declaredMediaType: file.type,
      bytes: buffer,
    });

    const allowlist = getAllowedMediaTypes();
    if (!isAllowedMediaType(mediaType, allowlist)) {
      return Response.json(
        {
          error: "Disallowed file type",
          mediaType,
          allowed: allowlist,
        },
        { status: 400 }
      );
    }

    const ref = await fileStorage.save(buffer, file.name, {
      prefix: `users/${userId}`,
    });
    const url = await fileStorage.resolveUrl(ref);
    const ttlSeconds = getTtlSeconds();

    return Response.json({
      ref,
      url,
      expiresAt: Date.now() + ttlSeconds * 1000,
      name: file.name,
      mediaType,
      size: buffer.byteLength,
    });
  } catch (error) {
    logError("Upload failed", error);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
