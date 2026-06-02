import express from "express";

import reviewRoute from "./review.route.js";

const router = express.Router();

// localhost:8005/api/v1/review/
router.use("/review", reviewRoute);

export default router;
