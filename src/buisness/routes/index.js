import express from "express";

import businessRoute from "./buisness.route.js";

const router = express.Router();

// localhost:8001/api/v1/business/
router.use("/business", businessRoute);

export default router;
