import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
app.disable("x-powered-by");

const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const developmentOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:5173",
  process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "",
].filter(Boolean);
const allowedOrigins = process.env.NODE_ENV === "production"
  ? configuredOrigins
  : [...new Set([...configuredOrigins, ...developmentOrigins])];

if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
  throw new Error("CORS_ALLOWED_ORIGINS must contain at least one HTTPS origin in production.");
}

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
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS origin not allowed"));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({
  limit: "256kb",
  strict: true,
  verify: (req, _res, buffer) => {
    (req as express.Request & { rawBody?: string }).rawBody = buffer.toString("utf8");
  },
}));
app.use(express.urlencoded({ extended: false, limit: "64kb", parameterLimit: 100 }));

app.use("/api", router);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err: error }, "Unhandled request error");
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error." });
});

export default app;
