import express from "express";

import report from "./report.route.js";

const router = express.Router();

// localhost:8005/api/v1/report/
router.use("/report", report);

export default router;
