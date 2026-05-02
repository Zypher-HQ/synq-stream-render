import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "synq-stream";

export const supabase = createClient(supabaseUrl, supabaseKey);

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();
    const filePath = `uploads/${objectId}`;

    // Note: createSignedUploadUrl is used for uploads, createSignedUrl is for downloads.
    // However, some versions of supabase-js use createSignedUrl with 'upsert' for both.
    // Given the type error, we use createSignedUploadUrl if available or remove upsert.
    const { data, error } = await (supabase.storage.from(bucketName) as any)
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      throw new Error(`Failed to generate upload URL: ${error?.message}`);
    }

    return data.signedUrl;
  }

  async getObjectEntityFile(objectPath: string) {
    const filePath = this.getFilePathFromObjectPath(objectPath);
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(filePath);

    if (error || !data) {
      throw new ObjectNotFoundError();
    }

    return data;
  }

  private getFilePathFromObjectPath(objectPath: string): string {
    if (objectPath.startsWith("/objects/")) {
      return objectPath.slice("/objects/".length);
    }
    return objectPath;
  }

  normalizeObjectEntityPath(signedUrl: string): string {
    // Supabase signed URLs contain the path after /object/sign/bucket/
    // We want to extract the actual file path to store in our DB
    try {
      const url = new URL(signedUrl);
      const pathParts = url.pathname.split("/");
      const bucketIdx = pathParts.indexOf(bucketName);
      if (bucketIdx !== -1 && bucketIdx + 1 < pathParts.length) {
        const filePath = pathParts.slice(bucketIdx + 1).join("/");
        return `/objects/${filePath}`;
      }
    } catch (e) {
      console.error("Error normalizing path", e);
    }
    return signedUrl;
  }

  async getPublicUrl(objectPath: string): Promise<string> {
    const filePath = this.getFilePathFromObjectPath(objectPath);
    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return data.publicUrl;
  }
}
