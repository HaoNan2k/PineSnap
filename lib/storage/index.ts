import fs from "node:fs/promises";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface FileStorage {
  /**
   * Save a file and return a stable reference key.
   */
  save(
    file: File | Blob | Buffer,
    filename: string,
    options?: { prefix?: string }
  ): Promise<string>;

  /**
   * Resolve a reference key to a publicly accessible URL (or signed URL).
   */
  resolveUrl(ref: string): Promise<string>;
}

export class LocalFileStorage implements FileStorage {
  private uploadDir: string;
  private publicPath: string;

  constructor(
    uploadDir = path.join(process.cwd(), "public", "uploads"),
    publicPath = "/uploads"
  ) {
    this.uploadDir = uploadDir;
    this.publicPath = publicPath;
  }

  async save(
    file: File | Blob | Buffer,
    filename: string,
    options?: { prefix?: string }
  ): Promise<string> {
    await fs.mkdir(this.uploadDir, { recursive: true });

    const ext = path.extname(filename);
    const key = `${uuidv4()}${ext}`; // Generate a unique key
    const withPrefix =
      options?.prefix && options.prefix.length > 0
        ? path.join(options.prefix, key)
        : key;
    const filePath = path.join(this.uploadDir, withPrefix);

    let buffer: Buffer;
    if (Buffer.isBuffer(file)) {
      buffer = file;
    } else {
      buffer = Buffer.from(await file.arrayBuffer());
    }

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    return withPrefix.replaceAll("\\", "/");
  }

  async resolveUrl(ref: string): Promise<string> {
    // In local dev, ref is just the filename in public/uploads
    return `${this.publicPath}/${ref}`;
  }
}

export class SupabaseFileStorage implements FileStorage {
  private bucket: string;
  private signedUrlTtlSeconds: number;

  constructor({
    bucket,
    signedUrlTtlSeconds,
  }: {
    bucket: string;
    signedUrlTtlSeconds: number;
  }) {
    this.bucket = bucket;
    this.signedUrlTtlSeconds = signedUrlTtlSeconds;
  }

  async save(
    file: File | Blob | Buffer,
    filename: string,
    options?: { prefix?: string }
  ): Promise<string> {
    const ext = path.extname(filename);
    const key = `${uuidv4()}${ext}`;
    const objectKey =
      options?.prefix && options.prefix.length > 0
        ? `${options.prefix.replaceAll("\\", "/").replace(/\/+$/, "")}/${key}`
        : key;

    let buffer: Buffer;
    if (Buffer.isBuffer(file)) {
      buffer = file;
    } else {
      buffer = Buffer.from(await file.arrayBuffer());
    }

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage
      .from(this.bucket)
      .upload(objectKey, buffer, {
        upsert: false,
        contentType: undefined,
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    return objectKey;
  }

  async resolveUrl(ref: string): Promise<string> {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(ref, this.signedUrlTtlSeconds);
    if (error || !data?.signedUrl) {
      throw new Error(`Create signed URL failed: ${error?.message ?? "unknown"}`);
    }
    return data.signedUrl;
  }
}

function createFileStorage(): FileStorage {
  const driver =
    process.env.FILE_STORAGE_DRIVER ??
    (process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "local");

  if (driver === "supabase") {
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";
    const ttl = Number(process.env.SUPABASE_SIGNED_URL_TTL_SECONDS ?? "300");
    const signedUrlTtlSeconds = Number.isFinite(ttl) && ttl > 0 ? ttl : 300;
    return new SupabaseFileStorage({ bucket, signedUrlTtlSeconds });
  }

  return new LocalFileStorage();
}

export const fileStorage = createFileStorage();

