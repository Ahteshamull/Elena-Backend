import express from "express";
import {
  forgotPassword,
  login,
  logout,
  getMyProfile,
  refreshAccessToken,
  ResendOtp,
  resetPassword,
  createUser,
  verifyOtp,
  changePassword,
  currentUserLogin,
  deleteUser,
  deleteMyAccount,
  verifyRegistration,
} from "../controller/auth.controller.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";
import {
  upload,
  errorCheck,
} from "../../helper/middlewares/imageControlMiddleware.js";

const router = express.Router();
//localhost:8005/api/v1/auth/create-user
router.post("/create-user", upload.single("license"), errorCheck, createUser);
//localhost:8005/api/v1/auth/verify-registration
router.post("/verify-registration", verifyRegistration);
//localhost:8005/api/v1/auth/login
router.post("/login", login);
//localhost:8005/api/v1/auth/logout
router.post("/logout", logout);
//localhost:8005/api/v1/auth/my-profile
router.get("/my-profile", authenticateToken, getMyProfile);
//localhost:8005/api/v1/auth/forgot-password
router.post("/forgot-password", forgotPassword);
//localhost:8005/api/v1/auth/change-password
router.post("/change-password", changePassword);
//localhost:8005/api/v1/auth/resend-otp
router.post("/resend-otp", ResendOtp);
//localhost:8005/api/v1/auth/verify-reset-otp
router.post("/verify-reset-otp", verifyOtp);
//localhost:8005/api/v1/auth/reset-password
router.post("/reset-password", resetPassword);
//localhost:8005/api/v1/auth/refresh-token
router.post("/refresh-token", refreshAccessToken);
//localhost:8005/api/v1/auth/current-user-login
router.post("/current-user-login", currentUserLogin);
//localhost:8005/api/v1/auth/delete-user
router.delete("/delete-user", authenticateToken, deleteUser);
//localhost:8005/api/v1/auth/delete-my-account
router.delete("/delete-my-account", authenticateToken, deleteMyAccount);

export default router;
