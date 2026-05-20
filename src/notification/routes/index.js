import express from "express";

import notification from "./notification.route.js";

const router = express.Router();

// localhost:8001/api/v1/notification/
router.use("/notification", notification);

export default router;
