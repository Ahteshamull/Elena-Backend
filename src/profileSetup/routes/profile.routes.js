import express from "express";
import {
  authenticateToken,
  requireSuperAdminOrAdminRole,
} from "../../helper/middlewares/auth.middleware.js";
import {
  upload,
  errorCheck,
} from "../../helper/middlewares/imageControlMiddleware.js";
import {
  upsertProfile,
  updateProfile,
  getMyProfile,
  getProfileByUserId,
  updateProfileStatus,
} from "../controllers/profile.controller.js";

const router = express.Router();

// Setup upload fields based on the 5-section wizard design
const uploadFields = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "cv", maxCount: 1 },
  { name: "governmentId", maxCount: 1 },
  { name: "foodSafetyCertificate", maxCount: 1 },
  { name: "dishPhotography", maxCount: 10 },
  { name: "eventHighlights", maxCount: 10 },
]);

// Routes
// POST localhost:8005/api/v1/profile/setup-profile - Create or update profile
router.post(
  "/setup-profile",
  authenticateToken,
  uploadFields,
  errorCheck,
  upsertProfile,
);

// PATCH localhost:8005/api/v1/profile/update-profile - Update own profile
router.patch(
  "/update-profile",
  authenticateToken,
  uploadFields,
  errorCheck,
  updateProfile,
);

// GET localhost:8005/api/v1/profile/me - Get logged-in user's profile
router.get("/me", authenticateToken, getMyProfile);

// GET localhost:8005/api/v1/profile/user/:id - Get chef's profile by userId
router.get("/user/:id", getProfileByUserId);

// PATCH localhost:8005/api/v1/profile/admin/status/:id - Approve or reject chef profile (Admin only)
router.patch(
  "/admin/status/:id",
  authenticateToken,
  requireSuperAdminOrAdminRole,
  updateProfileStatus,
);

export default router;
