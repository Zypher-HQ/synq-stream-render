export const SYNQ_DEV_PASSCODE = '110312';

export type VideoVisibility = 'public' | 'private' | 'password';

export interface VideoRecord {
  id: string;
  title: string;
  uploadedBy: string;
  uploadedAt: string;
  duration: number;
  viewCount: number;
  watchTimeSeconds: number;
  trafficSources: {
    direct: number;
    search: number;
    embedded: number;
    referral: number;
    unknown: number;
  };
  ownershipHistory: Array<{ from: string; to: string; at: string }>;
  thumbnailIsAutoExtracted: boolean;
  dailyViews: Record<string, number>;
  dropOffBuckets: number[];
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
  videoPath: string;
  thumbnailPath: string;
  thumbnailDataUrl?: string;
  visibility: VideoVisibility;
  hasPassword: boolean;
  /** Resolved playable URL — empty for locked private/password videos until access granted. */
  sourceUrl: string;
  /** Resolved thumbnail image URL. */
  thumbnailUrl: string;
}

interface RawVideoFromAPI {
  id: string;
  title: string;
  uploadedBy: string;
  uploadedAt: string;
  duration: number;
  viewCount: number;
  watchTimeSeconds: number;
  trafficSources: VideoRecord['trafficSources'];
  ownershipHistory: VideoRecord['ownershipHistory'];
  thumbnailIsAutoExtracted: boolean;
  dailyViews: Record<string, number>;
  dropOffBuckets: number[];
  deviceBreakdown: VideoRecord['deviceBreakdown'];
  videoPath?: string;
  thumbnailPath: string;
  thumbnailDataUrl?: string;
  visibility: VideoVisibility;
  hasPassword: boolean;
}

function resolveStorageUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  if (path.startsWith('/objects/')) {
    return `/api/storage${path}`;
  }
  return path;
}

function hydrate(raw: RawVideoFromAPI): VideoRecord {
  return {
    ...raw,
    videoPath: raw.videoPath ?? '',
    sourceUrl: resolveStorageUrl(raw.videoPath),
    thumbnailUrl: raw.thumbnailDataUrl || resolveStorageUrl(raw.thumbnailPath),
  };
}

function adminHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-synq-passcode': SYNQ_DEV_PASSCODE,
  };
}

export async function getAllVideos(includePrivate = false): Promise<VideoRecord[]> {
  const headers: Record<string, string> = includePrivate
    ? { 'x-synq-passcode': SYNQ_DEV_PASSCODE }
    : {};
  const res = await fetch('/api/videos', { headers });
  if (!res.ok) throw new Error('Failed to load videos');
  const data = (await res.json()) as { videos: RawVideoFromAPI[] };
  return data.videos.map(hydrate);
}

export async function getVideo(id: string, includePrivate = false): Promise<VideoRecord | undefined> {
  const headers: Record<string, string> = includePrivate
    ? { 'x-synq-passcode': SYNQ_DEV_PASSCODE }
    : {};
  const res = await fetch(`/api/videos/${id}`, { headers });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error('Failed to load video');
  const data = (await res.json()) as { video: RawVideoFromAPI };
  return hydrate(data.video);
}

export async function saveVideo(video: VideoRecord, password?: string): Promise<VideoRecord> {
  const body = {
    id: video.id,
    title: video.title,
    uploadedBy: video.uploadedBy,
    uploadedAt: video.uploadedAt,
    duration: video.duration,
    viewCount: video.viewCount,
    watchTimeSeconds: video.watchTimeSeconds,
    trafficSources: video.trafficSources,
    ownershipHistory: video.ownershipHistory,
    thumbnailIsAutoExtracted: video.thumbnailIsAutoExtracted,
    dailyViews: video.dailyViews,
    dropOffBuckets: video.dropOffBuckets,
    deviceBreakdown: video.deviceBreakdown,
    videoPath: video.videoPath,
    thumbnailPath: video.thumbnailPath,
    thumbnailDataUrl: video.thumbnailDataUrl,
    visibility: video.visibility,
    password,
  };
  const res = await fetch('/api/videos', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Failed to save video: ${detail}`);
  }
  const data = (await res.json()) as { video: RawVideoFromAPI };
  return hydrate(data.video);
}

export async function deleteVideo(id: string): Promise<void> {
  const res = await fetch(`/api/videos/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete video');
}

export async function transferOwnership(id: string, newOwner: string): Promise<VideoRecord> {
  const res = await fetch(`/api/videos/${id}/transfer`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ newOwner }),
  });
  if (!res.ok) throw new Error('Failed to transfer ownership');
  const data = (await res.json()) as { video: RawVideoFromAPI };
  return hydrate(data.video);
}

export async function incrementViewCount(
  id: string,
  source: keyof VideoRecord['trafficSources'] = 'direct',
): Promise<void> {
  await fetch(`/api/videos/${id}/view`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source }),
  });
}

export async function addWatchTime(id: string, seconds: number): Promise<void> {
  if (!seconds || seconds <= 0) return;
  await fetch(`/api/videos/${id}/watch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seconds }),
  });
}

export async function requestVideoAccess(
  id: string,
  password?: string,
  isAdmin = false,
): Promise<{ ok: boolean; videoUrl?: string; error?: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (isAdmin) headers['x-synq-passcode'] = SYNQ_DEV_PASSCODE;
  const res = await fetch(`/api/videos/${id}/access`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error || 'Access denied' };
  return { ok: true, videoUrl: resolveStorageUrl(data.videoPath) };
}

export interface UploadResult {
  videoPath: string;
  thumbnailPath: string;
  thumbnailDataUrl?: string;
}

export async function requestUploadUrl(file: File): Promise<{ uploadURL: string; objectPath: string }> {
  const res = await fetch('/api/storage/uploads/request-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: file.name,
      size: file.size,
      contentType: file.type || 'application/octet-stream',
    }),
  });
  if (!res.ok) throw new Error('Failed to get upload URL');
  return res.json();
}

export async function uploadFileToCloud(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const { uploadURL, objectPath } = await requestUploadUrl(file);
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadURL);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        onProgress((ev.loaded / ev.total) * 100);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed with status ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Upload network error'));
    xhr.send(file);
  });
  return objectPath;
}
