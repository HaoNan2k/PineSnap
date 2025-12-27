import { fileStorage } from "@/lib/storage";
import { mediaTypeResolver } from "@/lib/files/media-type";
import { logError } from "@/lib/logger";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";

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

    const ref = await fileStorage.save(buffer, file.name);
    const url = await fileStorage.resolveUrl(ref);

    return Response.json({
      ref,
      url,
      name: file.name,
      mediaType,
      size: buffer.byteLength,
    });
  } catch (error) {
    logError("Upload failed", error);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
