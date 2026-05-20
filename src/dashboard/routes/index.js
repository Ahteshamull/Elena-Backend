import express from "express";

import dashboard from "./dashboard.route.js";

const router = express.Router();

// localhost:8001/api/v1/dashboard/
router.use("/dashboard", dashboard);

export default router;
