import express from "express";

import subscription from "./subscription.route.js";

const router = express.Router();

// localhost:8001/api/v1/subscription/
router.use("/subscription", subscription);

export default router;
