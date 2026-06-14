import express from "express";
import {
  dashboard,
  userDashboard,
  chefDashboard,
} from "../controller/dashboard.controller.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";

const router = express.Router();

// Main dashboard endpoint - returns all data
// localhost:8005/api/v1/dashboard/
router.get("/", dashboard);

// User-specific dashboard endpoint
// localhost:8005/api/v1/dashboard/user-dashboard
router.get("/user-dashboard", authenticateToken, userDashboard);

// User-specific dashboard endpoint
// localhost:8005/api/v1/dashboard/user-dashboard
router.get("/user-dashboard", authenticateToken, userDashboard);

// Chef-specific dashboard endpoint
// localhost:8005/api/v1/dashboard/chef-dashboard
router.get("/chef-dashboard", authenticateToken, chefDashboard);

export default router;
