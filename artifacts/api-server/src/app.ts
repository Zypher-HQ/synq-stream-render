import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Debug error handling middleware
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (res.statusCode >= 400) {
        logger.error({
          msg: "API Error Debug",
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
        });
      }
    });
  }
  next();
});

app.use("/api", router);

// Serve static files from the frontend build
const publicPath = path.resolve(__dirname, "../../synq-stream/dist/public");
app.use(express.static(publicPath));

// Fallback to index.html for SPA routing
app.get("(.*)", (req, res) => {
  if (req.path.startsWith("/api")) return;
  res.sendFile(path.join(publicPath, "index.html"));
});

export default app;
