import { Router } from "express";

const router = Router();

// Get cron status
router.get("/status", (req, res) => {
  // This would need to be passed from the main app
  // For now, just return basic info
  res.json({
    message: "Cron status endpoint",
    enabled: process.env.ENABLE_CRON === "true",
    note: "Full status available through server logs",
  });
});

export default router;
