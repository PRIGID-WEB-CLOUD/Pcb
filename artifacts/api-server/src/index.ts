import app from "./app";
import { logger } from "./lib/logger";
import { ensureDefaults } from "./routes/channels";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

if (process.env.NODE_ENV === "production" && process.env.AUTH_DEV_BYPASS === "true") {
  throw new Error("AUTH_DEV_BYPASS cannot be enabled in production.");
}

if (process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_BYPASS === "true") {
  logger.warn("AUTH_DEV_BYPASS ENABLED — DEVELOPMENT ONLY");
}

async function start() {
  await ensureDefaults();
  app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  });
}

start().catch((error) => {
  logger.fatal({ err: error }, "Startup initialization failed");
  process.exit(1);
});
