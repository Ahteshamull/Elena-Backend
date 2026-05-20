import express from "express";
import {
  createService,
  getAllServices,
  getsingleservice,
  updateService,
  deleteService,
  getMyServices,
} from "../controllers/service.controller.js";
import {
  authenticateToken,
  requireRole,
} from "../../helper/middlewares/auth.middleware.js";
import { upload } from "../../helper/middlewares/imageControlMiddleware.js";
import {
  checkSubscription,
  checkServiceLimit,
} from "../../helper/middlewares/subscription.middleware.js";

const router = express.Router();

/**
 * Route to create a new service
 * Only accessible by serviceProvider
 */

//localhost:8001/api/v1/service/create-service
router.post(
  "/create-service",
  authenticateToken,
  requireRole("serviceProvider"),
  checkSubscription,
  checkServiceLimit,
  upload.array("serviceImages", 5), // Allow up to 5 images
  createService,
);

//localhost:8001/api/v1/service/get-all-services
router.get("/get-all-services", getAllServices);

// localhost:8001/api/v1/service/get-single-service/:id
router.get("/get-single-service/:id", getsingleservice);

// localhost:8001/api/v1/service/update-service/:id
router.patch(
  "/update-service/:id",
  authenticateToken,
  requireRole("serviceProvider"),
  upload.array("serviceImages", 5),
  updateService,
);

// localhost:8001/api/v1/service/delete-service/:id
router.delete(
  "/delete-service/:id",
  authenticateToken,
  requireRole("serviceProvider"),
  deleteService,
);

// localhost:8001/api/v1/service/get-my-services
router.get(
  "/get-my-services",
  authenticateToken,
  requireRole("serviceProvider"),
  getMyServices,
);

export default router;
