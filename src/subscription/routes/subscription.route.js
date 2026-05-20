import express from "express";
import { 
    createSubscription, 
    getAllSubscriptions, 
    selectPlan,
    updateSubscription
} from "../controllers/subscription.controller.js";
import superAdminMiddleware from "../../helper/middlewares/superAdminMiddleware.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";

const router = express.Router();

// Get all subscription plans
// localhost:8001/api/v1/subscription/get-all-subscriptions
router.get("/get-all-subscriptions", getAllSubscriptions);

// Create a new subscription plan (Admin only)
// localhost:8001/api/v1/subscription/create-subscription
router.post("/create-subscription", superAdminMiddleware, createSubscription);

// Select free trial (Authenticated users)
// localhost:8001/api/v1/subscription/select-plan/:subscriptionId
router.post("/select-plan/:subscriptionId", authenticateToken, selectPlan);

// localhost:8001/api/v1/subscription/update-subscription/:id
router.patch(
  "/update-subscription/:id",
  superAdminMiddleware,
  updateSubscription,
);

export default router;