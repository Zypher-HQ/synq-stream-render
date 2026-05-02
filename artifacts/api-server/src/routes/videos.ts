import { Router, type IRouter, type Request, type Response } from "express";
import { createHash } from "crypto";
import { z } from "zod";
import {
  deleteVideo,
  getVideo,
  listVideos,
  patchVideo,
  sanitizeForPublic,
  upsertVideo,
  type VideoRecord,
  type VideoVisibility,
} from "../lib/supabaseVideosStore";

const router: IRouter = Router();

const DEV_PASSCODE = process.env.SYNQ_DEV_PASSCODE ?? "110312";

function isAdminRequest(req: Request): boolean {
  const header = req.header("x-synq-passcode");
  return typeof header === "string" && header === DEV_PASSCODE;
}

function hashPassword(pw: string): string {
  return createHash("sha256")
    .update(`synq:${pw}`)
    .digest("hex")
    .slice(0, 32);
}

const TrafficSourcesSchema = z.object({
  direct: z.number().int().nonnegative().default(0),
  search: z.number().int().nonnegative().default(0),
  embedded: z.number().int().nonnegative().default(0),
  referral: z.number().int().nonnegative().default(0),
  unknown: z.number().int().nonnegative().default(0),
});

const UpsertSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  uploadedBy: z.string().min(1),
  uploadedAt: z.string().min(1),
  duration: z.number().nonnegative(),
  viewCount: z.number().int().nonnegative().default(0),
  watchTimeSeconds: z.number().nonnegative().default(0),
  trafficSources: TrafficSourcesSchema.default({
    direct: 0,
    search: 0,
    embedded: 0,
    referral: 0,
    unknown: 0,
  }),
  ownershipHistory: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        at: z.string(),
      }),
    )
    .default([]),
  thumbnailIsAutoExtracted: z.boolean().default(false),
  dailyViews: z.record(z.string(), z.number()).default({}),
  dropOffBuckets: z.array(z.number()).default([]),
  deviceBreakdown: z
    .object({
      desktop: z.number().int().nonnegative().default(0),
      mobile: z.number().int().nonnegative().default(0),
      tablet: z.number().int().nonnegative().default(0),
    })
    .default({ desktop: 0, mobile: 0, tablet: 0 }),
  videoPath: z.string().min(1),
  thumbnailPath: z.string().default(""),
  thumbnailDataUrl: z.string().optional(),
  visibility: z.enum(["public", "private", "password"]).default("public"),
  password: z.string().optional(),
});

router.get("/videos", async (req: Request, res: Response) => {
  try {
    const admin = isAdminRequest(req);
    const all = await listVideos();
    const visible = all.filter((v) => admin || v.visibility !== "private");
    res.json({
      videos: visible.map((v) => sanitizeForPublic(v, admin)),
    });
  } catch (err) {
    req.log.error({ err }, "Error listing videos");
    res.status(500).json({ error: "Failed to list videos" });
  }
});

router.get("/videos/:id", async (req: Request, res: Response) => {
  try {
    const admin = isAdminRequest(req);
    const v = await getVideo(String(req.params.id));
    if (!v) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (v.visibility === "private" && !admin) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.json({ video: sanitizeForPublic(v, admin) });
  } catch (err) {
    req.log.error({ err }, "Error getting video");
    res.status(500).json({ error: "Failed to get video" });
  }
});

router.post("/videos", async (req: Request, res: Response) => {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Dev passcode required" });
    return;
  }
  const parsed = UpsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }
  try {
    const data = parsed.data;
    const existing = await getVideo(data.id);
    const passwordHash =
      data.visibility === "password"
        ? data.password
          ? hashPassword(data.password)
          : existing?.passwordHash
        : undefined;

    if (data.visibility === "password" && !passwordHash) {
      res.status(400).json({ error: "Password required for password visibility" });
      return;
    }

    const record: VideoRecord = {
      id: data.id,
      title: data.title,
      uploadedBy: data.uploadedBy,
      uploadedAt: data.uploadedAt,
      duration: data.duration,
      viewCount: data.viewCount,
      watchTimeSeconds: data.watchTimeSeconds,
      trafficSources: data.trafficSources,
      ownershipHistory: data.ownershipHistory,
      thumbnailIsAutoExtracted: data.thumbnailIsAutoExtracted,
      dailyViews: data.dailyViews,
      dropOffBuckets: data.dropOffBuckets,
      deviceBreakdown: data.deviceBreakdown,
      videoPath: data.videoPath,
      thumbnailPath: data.thumbnailPath,
      thumbnailDataUrl: data.thumbnailDataUrl,
      visibility: data.visibility as VideoVisibility,
      passwordHash,
    };

    await upsertVideo(record);
    res.json({ video: sanitizeForPublic(record, true) });
  } catch (err) {
    req.log.error({ err }, "Error upserting video");
    res.status(500).json({ error: "Failed to upsert video" });
  }
});

router.delete("/videos/:id", async (req: Request, res: Response) => {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Dev passcode required" });
    return;
  }
  try {
    const removed = await deleteVideo(String(req.params.id));
    res.json({ deleted: !!removed });
  } catch (err) {
    req.log.error({ err }, "Error deleting video");
    res.status(500).json({ error: "Failed to delete video" });
  }
});

const AccessSchema = z.object({
  password: z.string().optional(),
});

router.post("/videos/:id/access", async (req: Request, res: Response) => {
  try {
    const admin = isAdminRequest(req);
    const v = await getVideo(String(req.params.id));
    if (!v) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (v.visibility === "public" || admin) {
      res.json({ ok: true, videoPath: v.videoPath });
      return;
    }
    if (v.visibility === "private") {
      res.status(403).json({ error: "Private video" });
      return;
    }
    const parsed = AccessSchema.safeParse(req.body);
    if (!parsed.success || !parsed.data.password) {
      res.status(400).json({ error: "Password required" });
      return;
    }
    if (hashPassword(parsed.data.password) !== v.passwordHash) {
      res.status(403).json({ error: "Incorrect password" });
      return;
    }
    res.json({ ok: true, videoPath: v.videoPath });
  } catch (err) {
    req.log.error({ err }, "Error checking access");
    res.status(500).json({ error: "Failed to check access" });
  }
});

const ViewSchema = z.object({
  source: z
    .enum(["direct", "search", "embedded", "referral", "unknown"])
    .default("direct"),
});

router.post("/videos/:id/view", async (req: Request, res: Response) => {
  try {
    const parsed = ViewSchema.safeParse(req.body ?? {});
    const source = parsed.success ? parsed.data.source : "direct";
    const updated = await patchVideo(String(req.params.id), (v) => {
      v.viewCount += 1;
      v.trafficSources[source] = (v.trafficSources[source] ?? 0) + 1;
      const today = new Date().toISOString().split("T")[0];
      v.dailyViews[today] = (v.dailyViews[today] ?? 0) + 1;
    });
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ viewCount: updated.viewCount });
  } catch (err) {
    req.log.error({ err }, "Error incrementing view");
    res.status(500).json({ error: "Failed to record view" });
  }
});

const WatchSchema = z.object({
  seconds: z.number().nonnegative().max(3600),
});

router.post("/videos/:id/watch", async (req: Request, res: Response) => {
  try {
    const parsed = WatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body" });
      return;
    }
    const updated = await patchVideo(String(req.params.id), (v) => {
      v.watchTimeSeconds += parsed.data.seconds;
    });
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ watchTimeSeconds: updated.watchTimeSeconds });
  } catch (err) {
    req.log.error({ err }, "Error adding watch time");
    res.status(500).json({ error: "Failed to record watch time" });
  }
});

const TransferSchema = z.object({
  newOwner: z.string().min(1),
});

router.post("/videos/:id/transfer", async (req: Request, res: Response) => {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Dev passcode required" });
    return;
  }
  try {
    const parsed = TransferSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body" });
      return;
    }
    const updated = await patchVideo(String(req.params.id), (v) => {
      v.ownershipHistory.push({
        from: v.uploadedBy,
        to: parsed.data.newOwner,
        at: new Date().toISOString(),
      });
      v.uploadedBy = parsed.data.newOwner;
    });
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ video: sanitizeForPublic(updated, true) });
  } catch (err) {
    req.log.error({ err }, "Error transferring ownership");
    res.status(500).json({ error: "Failed to transfer ownership" });
  }
});

export default router;
