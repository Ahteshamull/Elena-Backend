import express from "express";

import serviceRoute from "./service.route.js";

const router = express.Router();

// localhost:8001/api/v1/service/
router.use("/service", serviceRoute);

export default router;
