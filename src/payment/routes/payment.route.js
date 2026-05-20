import { Router } from "express";
import express from "express";

import {
  authenticateToken,
  requireHostRole,
} from "../../helper/middlewares/auth.middleware.js";
const router = Router();

import {
  createSubscriptionCheckout,
  verifySubscriptionPayment,
  webhook,
  capturePayment,
  getPaymentStatus,
  getUserPayments,
  stripeAccountOnboarding,
  userSpendingGrowth,
  adminEarnings,
} from "../controller/payment.controller.js";
import { requireHostOrInfluencerRole } from "../../helper/middlewares/role.middleware.js";
import superAdminMiddleware from "../../helper/middlewares/superAdminMiddleware.js";

// localhost:8001/api/v1/payment/stripe-account-onboarding
router.post(
  "/stripe-account-onboarding",
  authenticateToken,
  requireHostOrInfluencerRole,
  stripeAccountOnboarding,
);

// localhost:8001/api/v1/payment/verify-subscription?sessionId=cs_test_...
router.get(
  "/verify-subscription",
  authenticateToken,
  verifySubscriptionPayment,
);

// localhost:8001/api/v1/payment/subscription-checkout/:subscriptionId
router.post(
  "/subscription-checkout/:subscriptionId",
  authenticateToken,
  createSubscriptionCheckout,
);

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_KEY;
console.log(STRIPE_WEBHOOK_SECRET);

// localhost:8001/api/v1/payment/webhook
router.post("/webhook", webhook);

// localhost:8001/api/v1/payment/capture/:paymentId
router.post(
  "/capture/:paymentId",
  authenticateToken,
  requireHostRole,
  capturePayment,
);

// localhost:8001/api/v1/payment/status/:paymentId
router.get("/status/:paymentId", authenticateToken, getPaymentStatus);

// localhost:8001/api/v1/payment/my-payments
router.get("/my-payments", authenticateToken, getUserPayments);

// localhost:8001/api/v1/payment/user-spending-growth
router.get("/user-spending-growth", authenticateToken, userSpendingGrowth);

// localhost:8001/api/v1/payment/admin/earnings
router.get("/admin/earnings", superAdminMiddleware, adminEarnings);

export default router;
