import { db } from "@workspace/db";
import { videosTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

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

export async function listVideos(): Promise<VideoRecord[]> {
  const results = await db.select().from(videosTable);
  return results.map(mapDbToRecord);
}

export async function getVideo(id: string): Promise<VideoRecord | undefined> {
  const [result] = await db.select().from(videosTable).where(eq(videosTable.id, id));
  return result ? mapDbToRecord(result) : undefined;
}

export async function upsertVideo(record: VideoRecord): Promise<VideoRecord> {
  const dbRecord = mapRecordToDb(record);
  await db.insert(videosTable).values(dbRecord).onConflictDoUpdate({
    target: videosTable.id,
    set: dbRecord,
  });
  return record;
}

export async function deleteVideo(id: string): Promise<VideoRecord | null> {
  const video = await getVideo(id);
  if (!video) return null;
  await db.delete(videosTable).where(eq(videosTable.id, id));
  return video;
}

export async function patchVideo(
  id: string,
  patch: (v: VideoRecord) => void,
): Promise<VideoRecord | null> {
  const video = await getVideo(id);
  if (!video) return null;
  patch(video);
  return await upsertVideo(video);
}

function mapDbToRecord(row: any): VideoRecord {
  return {
    ...row,
    uploadedAt: row.uploadedAt.toISOString(),
    trafficSources: row.trafficSources as VideoTrafficSources,
    ownershipHistory: row.ownershipHistory as VideoOwnershipChange[],
    dailyViews: row.dailyViews as Record<string, number>,
    dropOffBuckets: row.dropOffBuckets as number[],
    deviceBreakdown: row.deviceBreakdown as VideoDeviceBreakdown,
  };
}

function mapRecordToDb(record: VideoRecord): any {
  return {
    ...record,
    uploadedAt: new Date(record.uploadedAt),
  };
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
