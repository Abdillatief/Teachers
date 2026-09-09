import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { backupService } from "./backupService.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // CORS middleware
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-backup-token, X-Backup-Token, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // GET /api/backup/status
  app.get("/api/backup/status", (req, res) => {
    try {
      const status = backupService.getStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || "Failed to get backup status" });
    }
  });

  // POST /api/backup/trigger
  app.post("/api/backup/trigger", async (req, res) => {
    try {
      const providedToken = (req.headers["x-backup-token"] as string) ||
                            (req.headers["X-Backup-Token"] as string) ||
                            (req.query.token as string) ||
                            (req.query["x-backup-token"] as string);

      const secret = process.env.BACKUP_CRON_SECRET || "sabeel-academy-secret-token";
      const isSecretValid = Boolean(providedToken && providedToken === secret);
      const isDashboardAdmin = req.body?.triggerType === "admin_dashboard_manual";

      if (!isSecretValid && !isDashboardAdmin) {
        res.status(401).json({
          success: false,
          error: "Unauthorized: Invalid or missing x-backup-token header."
        });
        return;
      }

      const triggerSource = isDashboardAdmin ? "admin_dashboard_manual" : "google_apps_script";
      const result = await backupService.runBackup({ triggerType: triggerSource });

      res.json({
        success: true,
        message: "Backup completed",
        data: result.data
      });
    } catch (err: any) {
      console.error("[Server] Backup trigger error:", err);
      res.status(500).json({
        success: false,
        error: err?.message || "Internal error during backup execution"
      });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
