import express from "express";
import {
  createBusiness,
  getAllBusinesses,
  getBusinessById,
  updateBusinessById,
  getMyBusiness,
  deleteBusiness,
} from "../controllers/buisness.controller.js";
import { getMyPendingBookings } from "../../booking-service/controller/bookign.controller.js";
import {
  authenticateToken,
  requireServiceProviderRole,
} from "../../helper/middlewares/auth.middleware.js";
import { upload } from "../../helper/middlewares/imageControlMiddleware.js";

const router = express.Router();

// localhost:8001/api/v1/business/create-business
router.post(
  "/create-business",
  authenticateToken,
  requireServiceProviderRole,
  upload.single("image"),
  createBusiness,
);

//localhost:8001/api/v1/business/all-businesses
router.get("/all-businesses", getAllBusinesses);

//localhost:8001/api/v1/business/get-business/:id
router.get("/get-business/:id", getBusinessById);

//localhost:8001/api/v1/business/update-business/:id
router.patch(
  "/update-business/:id",
  authenticateToken,
  requireServiceProviderRole,
  upload.single("image"),
  updateBusinessById,
);

//localhost:8001/api/v1/business/get-my-business
router.get(
  "/get-my-business",
  authenticateToken,
  requireServiceProviderRole,
  getMyBusiness,
);

//localhost:8001/api/v1/business/delete-business/:id
router.delete(
  "/delete-business/:id",
  authenticateToken,
  requireServiceProviderRole,
  deleteBusiness,
);

//localhost:8001/api/v1/business/get-my-pending-bookings
router.get(
  "/get-my-pending-bookings",
  authenticateToken,
  requireServiceProviderRole,
  getMyPendingBookings,
);

export default router;
