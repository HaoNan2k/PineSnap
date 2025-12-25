import { NextResponse } from "next/server";
import { fileStorage } from "@/lib/storage";
import { mediaTypeResolver } from "@/lib/files/media-type";
import { logError } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Basic validation
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
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

    return NextResponse.json({
      ref,
      url,
      name: file.name,
      mediaType,
      size: buffer.byteLength,
    });
  } catch (error) {
    logError("Upload failed", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

