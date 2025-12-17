import fs from "node:fs/promises";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";

export interface FileStorage {
  /**
   * Save a file and return a stable reference key.
   */
  save(file: File | Blob | Buffer, filename: string): Promise<string>;

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

  async save(file: File | Blob | Buffer, filename: string): Promise<string> {
    await fs.mkdir(this.uploadDir, { recursive: true });

    const ext = path.extname(filename);
    const key = `${uuidv4()}${ext}`; // Generate a unique key
    const filePath = path.join(this.uploadDir, key);

    let buffer: Buffer;
    if (Buffer.isBuffer(file)) {
      buffer = file;
    } else {
      buffer = Buffer.from(await file.arrayBuffer());
    }

    await fs.writeFile(filePath, buffer);
    return key;
  }

  async resolveUrl(ref: string): Promise<string> {
    // In local dev, ref is just the filename in public/uploads
    return `${this.publicPath}/${ref}`;
  }
}

// Singleton instance for the app
export const fileStorage = new LocalFileStorage();

