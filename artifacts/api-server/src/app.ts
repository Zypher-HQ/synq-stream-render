import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import http from "http";

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

// Keep-alive: Ping self every 10 minutes to prevent sleep
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_EXTERNAL_URL) {
  setInterval(() => {
    http.get(`${RENDER_EXTERNAL_URL}/health`, (res) => {
      logger.info({ statusCode: res.statusCode }, "Self-ping health check");
    }).on('error', (err) => {
      logger.error({ err }, "Self-ping failed");
    });
  }, 10 * 60 * 1000); 
}

app.use("/api", router);

// Serve static files from the frontend build
const publicPath = path.resolve(__dirname, "../../synq-stream/dist/public");
app.use(express.static(publicPath));

// Keep-alive endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Fallback to index.html for SPA routing - using the most compatible pattern
app.get(/^(?!\/api).+/, (req, res) => {
  if (req.path.startsWith("/api")) return;
  res.sendFile(path.join(publicPath, "index.html"), (err) => {
    if (err) {
      res.status(404).send("Not Found");
    }
  });
});

export default app;
