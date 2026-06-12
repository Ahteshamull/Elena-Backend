import express from "express";
import {
  createAdmin,
  adminLogin,
  updateAdminPersonalInfo,
  adminChangePassword,
  deleteAdmin,
  allAdmin,
  singleAdmin,
  forgotPassAdmin,
  OTPVerifyAdmin,
  resetPasswordAdmin,
  approveUser,
  resendOtpAdmin,
  adminOverview,
} from "../controller/admin.controller.js";
import {
  upload,
  errorCheck,
} from "../../helper/middlewares/imageControlMiddleware.js";
import superAdminMiddleware from "../../helper/middlewares/superAdminMiddleware.js";
import adminMiddleware from "../../helper/middlewares/authmiddleware.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";

const router = express.Router();

// Create Admin route with file upload

//localhost:8005/api/v1/admin/create-admin
router.post(
  "/create-admin",
  // authenticateToken,
  upload.single("image"),
  errorCheck,
  createAdmin,
);

//localhost:8005/api/v1/admin/admin-login
router.post("/admin-login", adminLogin);

//localhost:8005/api/v1/admin/update-admin-personal-info
router.put(
  "/update-admin-personal-info",
  upload.single("image"),
  errorCheck,
  authenticateToken,
  updateAdminPersonalInfo,
);

//localhost:8005/api/v1/admin/change-password
router.put("/change-password", authenticateToken, adminChangePassword);

//localhost:8005/api/v1/admin/delete-admin/:id
router.delete(
  "/delete-admin/:id",
  authenticateToken,
  superAdminMiddleware,
  deleteAdmin,
);

//localhost:8005/api/v1/admin/all-admins
router.get("/all-admins", authenticateToken, allAdmin);

//localhost:8005/api/v1/admin/single-admin/:id
router.get("/single-admin/:id", authenticateToken, singleAdmin);

//localhost:8005/api/v1/admin/forgot-password
router.post("/forgot-password", forgotPassAdmin);

//localhost:8005/api/v1/admin/otp-verify
router.post("/otp-verify", OTPVerifyAdmin);

//localhost:8005/api/v1/admin/resend-otp
router.post("/resend-otp", resendOtpAdmin);

//localhost:8005/api/v1/admin/reset-password
router.post("/reset-password", resetPasswordAdmin);

//localhost:8005/api/v1/admin/approve-user/:id
router.patch("/approve-user/:id", authenticateToken, approveUser);

// admin overview 
router.get("/overview", authenticateToken, adminOverview);

export default router;
