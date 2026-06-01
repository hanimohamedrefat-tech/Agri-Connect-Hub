import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploaded files — served at /api/uploads/*
// In dev: relative to artifacts/api-server/uploads/
// In prod: same (uploads/ next to the built dist/)
const uploadsDir = isProduction
  ? path.join(process.cwd(), "uploads")
  : path.join(process.cwd(), "uploads");
app.use("/api/uploads", express.static(uploadsDir));

// All API routes
app.use("/api", router);

// In production, serve the built React frontend and handle SPA routing
if (isProduction) {
  // Built frontend lives at artifacts/zira3a/dist/public/ relative to monorepo root
  // When running from project root: process.cwd() is the monorepo root
  const staticDir = path.join(process.cwd(), "artifacts", "zira3a", "dist", "public");
  app.use(express.static(staticDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

export default app;
