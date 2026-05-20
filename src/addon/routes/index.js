import express from "express";
import {
  createAddon,
  getAllAddons,
  purchaseAddon,
} from "../controller/addon.controller.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";
import superAdminMiddleware from "../../helper/middlewares/superAdminMiddleware.js";

const router = express.Router();

// Get all available addons
router.get("/get-all-addons", getAllAddons);
//localhost:8000/api/v1/addon/get-all-addons

// Create a new addon (Admin only)
router.post(
  "/create-addon",
  authenticateToken,
  superAdminMiddleware,
  createAddon,
);
//localhost:8000/api/v1/addon/create-addon

// Purchase an addon
router.post("/purchase-addon/:addonId", authenticateToken, purchaseAddon);
//localhost:8000/api/v1/addon/purchase-addon/1
export default router;
