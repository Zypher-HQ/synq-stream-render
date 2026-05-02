import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError, supabase } from "../lib/supabaseStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const RequestUploadUrlBody = z.object({
  name: z.string().min(1),
  size: z.number().int().nonnegative(),
  contentType: z.string().min(1),
});

router.post(
  "/storage/uploads/request-url",
  async (req: Request, res: Response) => {
    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required fields" });
      return;
    }

    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath =
        objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        metadata: parsed.data,
      });
    } catch (error) {
      req.log.error({ err: error }, "Error generating upload URL");
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  },
);

router.get(
  "/storage/objects/*path",
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.path;
      const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
      
      const { data, error } = await supabase.storage
        .from(process.env.SUPABASE_STORAGE_BUCKET || "synq-stream")
        .createSignedUrl(wildcardPath, 3600);

      if (error || !data) {
        res.status(404).json({ error: "Object not found" });
        return;
      }

      res.redirect(data.signedUrl);
    } catch (error) {
      req.log.error({ err: error }, "Error serving object");
      if (!res.headersSent) res.status(500).json({ error: "Failed to serve object" });
    }
  },
);

router.get(
  "/storage/public-objects/*filePath",
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join("/") : raw;
      const publicUrl = await objectStorageService.getPublicUrl(filePath);
      res.redirect(publicUrl);
    } catch (error) {
      req.log.error({ err: error }, "Error serving public object");
      res.status(500).json({ error: "Failed to serve public object" });
    }
  },
);

export default router;
