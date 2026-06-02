import express from "express";
import {
  allUser,
  singleUser,
  updateProfile,
  deleteUser,
  userGrowth,
  blockUser,
  allBlockedUsers,
  approveChef,
} from "../controller/user.controller.js";
import {
  upload,
  errorCheck,
} from "../../helper/middlewares/imageControlMiddleware.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";
import superAdminMiddleware from "../../helper/middlewares/superAdminMiddleware.js";
import adminMiddleware from "../../helper/middlewares/authmiddleware.js";
const router = express.Router();

//localhost:8005/api/v1/user/all-users
router.get("/all-users", allUser);

//localhost:8005/api/v1/user/single-user/:id
router.get("/single-user/:id", singleUser);

//localhost:8005/api/v1/user/update-profile - Update own profile (gets ID from token)
router.patch(
  "/update-profile",
  authenticateToken,
  upload.single("image"),
  errorCheck,
  updateProfile,
);

//localhost:8005/api/v1/user/delete-user/:id
router.delete("/delete-user/:id", deleteUser);

//localhost:8005/api/v1/user/user-growth
router.get("/user-growth", userGrowth);

//localhost:8005/api/v1/user/block-user/:id
router.patch("/block-user/:id", authenticateToken, blockUser);

//localhost:8005/api/v1/user/blocked-users
router.get(
  "/blocked-users",
  superAdminMiddleware,
  adminMiddleware,
  allBlockedUsers,
);

//localhost:8005/api/v1/user/approve-provider/:id
router.patch("/approve-provider/:id", authenticateToken, approveChef);

export default router;
