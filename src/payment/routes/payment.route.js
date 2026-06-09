import { Router } from "express";
import express from "express";

import {
  authenticateToken,
  requireChefRole,
} from "../../helper/middlewares/auth.middleware.js";
const router = Router();

import {
  webhook,
  capturePayment,
  getPaymentStatus,
  getUserPayments,
  stripeAccountOnboarding,
  userSpendingGrowth,
  adminEarnings,
  createCheckoutSession,
  paymentSuccess,
  paymentCancel,
} from "../controller/payment.controller.js";
import superAdminMiddleware from "../../helper/middlewares/superAdminMiddleware.js";

// localhost:8005/api/v1/payment/stripe-account-onboarding
router.post(
  "/stripe-account-onboarding",
  authenticateToken,
  requireChefRole,
  stripeAccountOnboarding,
);

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_KEY;
console.log(STRIPE_WEBHOOK_SECRET);

// localhost:8005/api/v1/payment/webhook
router.post("/webhook", webhook);

// localhost:8005/api/v1/payment/capture/:paymentId
router.post(
  "/capture/:paymentId",
  authenticateToken,
  capturePayment,
);

// localhost:8005/api/v1/payment/checkout/:bookingId
router.post(
  "/checkout/:bookingId",
  authenticateToken,
  createCheckoutSession,
);

// Payment redirect routes
router.get("/success", paymentSuccess);
router.get("/cancel", paymentCancel);

// localhost:8005/api/v1/payment/status/:paymentId
router.get("/status/:paymentId", authenticateToken, getPaymentStatus);

// localhost:8005/api/v1/payment/my-payments
router.get("/my-payments", authenticateToken, getUserPayments);

// localhost:8005/api/v1/payment/user-spending-growth
router.get("/user-spending-growth", authenticateToken, userSpendingGrowth);

// localhost:8005/api/v1/payment/admin/earnings
router.get("/admin/earnings", superAdminMiddleware, adminEarnings);

export default router;
