import app from "./app";
import { logger } from "./lib/logger";

// Robust Error Handling for Uncaught Exceptions
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught Exception detected");
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.fatal({ reason, promise }, "Unhandled Rejection detected");
  process.exit(1);
});

const rawPort = process.env["PORT"] || "3000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  logger.error({ rawPort }, "Invalid PORT value, defaulting to 3000");
}

const serverPort = Number.isNaN(port) || port <= 0 ? 3000 : port;

try {
  app.listen(serverPort, "0.0.0.0", () => {
    logger.info({ port: serverPort }, "Server listening on 0.0.0.0");
  });
} catch (err) {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
}
