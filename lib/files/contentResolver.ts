import fs from "node:fs/promises";
import path from "node:path";

export interface FileContentResolver {
  /**
   * Read raw bytes for a stored file. Used for bytes-first prompt hydration.
   */
  readBytes(ref: string): Promise<Uint8Array>;
  /**
   * Resolve a reference key to a public URL. Intended for UI replay/rendering.
   * This URL MUST NOT be assumed to be accessible by model providers.
   *
   * NOTE: This method is currently not used by the bytes-first model hydration path.
   * It is kept intentionally for future cloud storage integration (public/signed URLs).
   */
  resolvePublicUrl(ref: string): Promise<string>;
}

export class LocalFileContentResolver implements FileContentResolver {
  private uploadDir: string;
  private publicPath: string;

  constructor(
    uploadDir = path.join(process.cwd(), "public", "uploads"),
    publicPath = "/uploads"
  ) {
    this.uploadDir = uploadDir;
    this.publicPath = publicPath;
  }

  async readBytes(ref: string): Promise<Uint8Array> {
    const filePath = path.join(this.uploadDir, ref);
    const buffer = await fs.readFile(filePath);
    return new Uint8Array(buffer);
  }

  async resolvePublicUrl(ref: string): Promise<string> {
    return `${this.publicPath}/${ref}`;
  }
}

export const fileContentResolver: FileContentResolver =
  new LocalFileContentResolver();

