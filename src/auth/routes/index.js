import express from "express";
import auth from "./auth.routes.js";

const router = express.Router();

// localhost:8001/api/v1/auth/
router.use("/auth", auth);

export default router;
