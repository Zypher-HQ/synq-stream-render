import { pgTable, text, doublePrecision, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const videosTable = pgTable("videos", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull(),
  duration: doublePrecision("duration").notNull(),
  viewCount: integer("view_count").default(0),
  watchTimeSeconds: doublePrecision("watch_time_seconds").default(0),
  trafficSources: jsonb("traffic_sources"),
  ownershipHistory: jsonb("ownership_history"),
  thumbnailIsAutoExtracted: boolean("thumbnail_is_auto_extracted"),
  dailyViews: jsonb("daily_views"),
  dropOffBuckets: jsonb("drop_off_buckets"),
  deviceBreakdown: jsonb("device_breakdown"),
  videoPath: text("video_path").notNull(),
  thumbnailPath: text("thumbnail_path").notNull(),
  thumbnailDataUrl: text("thumbnail_data_url"),
  visibility: text("visibility").notNull(),
  passwordHash: text("password_hash"),
});
