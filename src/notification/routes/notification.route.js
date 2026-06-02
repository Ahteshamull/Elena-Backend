import express from "express";
import {
  listNotifications,
  markNotification,
  markAllNotifications,
} from "../controller/notification.controller.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";

const router = express.Router();

// localhost:8005/api/v1/notification/list
router.get("/list", authenticateToken, listNotifications);

// localhost:8005/api/v1/notification/mark/:id
router.patch("/mark/:id", authenticateToken, markNotification);

// localhost:8005/api/v1/notification/mark-all
router.patch("/mark-all", authenticateToken, markAllNotifications);

export default router;
