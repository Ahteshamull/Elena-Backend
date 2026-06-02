import express from "express";
import { createReport } from "../controller/report.controller.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";

const router = express.Router();

// localhost:8005/api/v1/report/create-report/:userId
router.post("/create-report/:userId", authenticateToken, createReport);

export default router;
