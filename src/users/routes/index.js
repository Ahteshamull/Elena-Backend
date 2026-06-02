import express from "express";

import user from "./user.routes.js";

const router = express.Router();

// localhost:8005/api/v1/user/
router.use("/user", user);

export default router;
