import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";
import workspaceRoutes from "./routes/workspaces";
import { requestLogger } from "./middleware/logger";
import { AppError } from "./lib/errors";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true, // Required for httpOnly cookies
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: err.message,
        code: err.code,
      });
      return;
    }

    console.error(err.stack);

    const isDev = process.env.NODE_ENV !== "production";
    res.status(500).json({
      error: err.message,
      code: "INTERNAL_ERROR",
      ...(isDev && { stack: err.stack }),
    });
  },
);

app.listen(PORT, () => {
  console.log(`🚀 ShiftWise API running on http://localhost:${PORT}`);
});

export default app;
