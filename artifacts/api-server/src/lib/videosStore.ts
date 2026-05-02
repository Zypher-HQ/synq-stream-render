import { Readable } from "stream";
import { objectStorageClient } from "./objectStorage";

export interface VideoTrafficSources {
  direct: number;
  search: number;
  embedded: number;
  referral: number;
  unknown: number;
}

export interface VideoOwnershipChange {
  from: string;
  to: string;
  at: string;
}

export interface VideoDeviceBreakdown {
  desktop: number;
  mobile: number;
  tablet: number;
}

export type VideoVisibility = "public" | "private" | "password";

export interface VideoRecord {
  id: string;
  title: string;
  uploadedBy: string;
  uploadedAt: string;
  duration: number;
  viewCount: number;
  watchTimeSeconds: number;
  trafficSources: VideoTrafficSources;
  ownershipHistory: VideoOwnershipChange[];
  thumbnailIsAutoExtracted: boolean;
  dailyViews: Record<string, number>;
  dropOffBuckets: number[];
  deviceBreakdown: VideoDeviceBreakdown;
  videoPath: string;
  thumbnailPath: string;
  thumbnailDataUrl?: string;
  visibility: VideoVisibility;
  passwordHash?: string;
}

interface Manifest {
  videos: VideoRecord[];
  updatedAt: string;
}

const MANIFEST_FILE_NAME = ".synq/videos.json";

function getPrivateObjectDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir) {
    throw new Error("PRIVATE_OBJECT_DIR is not set");
  }
  return dir;
}

function manifestLocation(): { bucketName: string; objectName: string } {
  const dir = getPrivateObjectDir();
  const trimmed = dir.startsWith("/") ? dir.slice(1) : dir;
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length < 1) {
    throw new Error("Invalid PRIVATE_OBJECT_DIR");
  }
  const bucketName = parts[0];
  const objectName = [...parts.slice(1), MANIFEST_FILE_NAME].join("/");
  return { bucketName, objectName };
}

let cache: Manifest | null = null;
let loadPromise: Promise<Manifest> | null = null;
let savePromise: Promise<void> = Promise.resolve();

async function fetchManifest(): Promise<Manifest> {
  const { bucketName, objectName } = manifestLocation();
  const file = objectStorageClient.bucket(bucketName).file(objectName);
  const [exists] = await file.exists();
  if (!exists) {
    return { videos: [], updatedAt: new Date(0).toISOString() };
  }
  const [buf] = await file.download();
  try {
    const parsed = JSON.parse(buf.toString("utf-8")) as Manifest;
    if (!Array.isArray(parsed.videos)) {
      return { videos: [], updatedAt: new Date(0).toISOString() };
    }
    return parsed;
  } catch {
    return { videos: [], updatedAt: new Date(0).toISOString() };
  }
}

async function persistManifest(manifest: Manifest): Promise<void> {
  const { bucketName, objectName } = manifestLocation();
  const file = objectStorageClient.bucket(bucketName).file(objectName);
  const data = Buffer.from(JSON.stringify(manifest), "utf-8");
  await new Promise<void>((resolve, reject) => {
    const stream = file.createWriteStream({
      contentType: "application/json",
      resumable: false,
      metadata: { cacheControl: "no-cache" },
    });
    stream.on("error", reject);
    stream.on("finish", () => resolve());
    Readable.from(data).pipe(stream);
  });
}

export async function getManifest(): Promise<Manifest> {
  if (cache) return cache;
  if (!loadPromise) {
    loadPromise = fetchManifest().then((m) => {
      cache = m;
      return m;
    });
  }
  return loadPromise;
}

export async function listVideos(): Promise<VideoRecord[]> {
  const m = await getManifest();
  return [...m.videos];
}

export async function getVideo(id: string): Promise<VideoRecord | undefined> {
  const m = await getManifest();
  return m.videos.find((v) => v.id === id);
}

async function commit(): Promise<void> {
  if (!cache) return;
  const snapshot: Manifest = {
    videos: cache.videos,
    updatedAt: new Date().toISOString(),
  };
  cache.updatedAt = snapshot.updatedAt;
  savePromise = savePromise
    .catch(() => undefined)
    .then(() => persistManifest(snapshot));
  await savePromise;
}

export async function upsertVideo(record: VideoRecord): Promise<VideoRecord> {
  const m = await getManifest();
  const idx = m.videos.findIndex((v) => v.id === record.id);
  if (idx >= 0) {
    m.videos[idx] = { ...m.videos[idx], ...record };
  } else {
    m.videos.push(record);
  }
  await commit();
  return record;
}

export async function deleteVideo(id: string): Promise<VideoRecord | null> {
  const m = await getManifest();
  const idx = m.videos.findIndex((v) => v.id === id);
  if (idx < 0) return null;
  const [removed] = m.videos.splice(idx, 1);
  await commit();
  return removed;
}

export async function patchVideo(
  id: string,
  patch: (v: VideoRecord) => void,
): Promise<VideoRecord | null> {
  const m = await getManifest();
  const v = m.videos.find((x) => x.id === id);
  if (!v) return null;
  patch(v);
  await commit();
  return v;
}

export function sanitizeForPublic(
  v: VideoRecord,
  isAdmin: boolean,
): Omit<VideoRecord, "passwordHash" | "videoPath"> & {
  videoPath?: string;
  hasPassword: boolean;
} {
  const base = {
    id: v.id,
    title: v.title,
    uploadedBy: v.uploadedBy,
    uploadedAt: v.uploadedAt,
    duration: v.duration,
    viewCount: v.viewCount,
    watchTimeSeconds: v.watchTimeSeconds,
    trafficSources: v.trafficSources,
    ownershipHistory: v.ownershipHistory,
    thumbnailIsAutoExtracted: v.thumbnailIsAutoExtracted,
    dailyViews: v.dailyViews,
    dropOffBuckets: v.dropOffBuckets,
    deviceBreakdown: v.deviceBreakdown,
    thumbnailPath: v.thumbnailPath,
    thumbnailDataUrl: v.thumbnailDataUrl,
    visibility: v.visibility,
    hasPassword: v.visibility === "password",
  };
  if (isAdmin || v.visibility === "public") {
    return { ...base, videoPath: v.videoPath };
  }
  return base;
}
