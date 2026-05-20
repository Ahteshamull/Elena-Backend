import express from "express";
import {
  createBooking,
  updateBookingStatus,
  getMyBookings,
  getSingleBooking,

} from "../controller/bookign.controller.js";
import {
  authenticateToken,
  requireServiceProviderRole,
} from "../../helper/middlewares/auth.middleware.js";
import superAdminMiddleware from "../../helper/middlewares/superAdminMiddleware.js";

const router = express.Router();

// localhost:8001/api/v1/booking/create-booking
router.post("/create-booking", authenticateToken, createBooking);

// localhost:8001/api/v1/booking/update-status/:id
router.patch(
  "/update-status/:id",
  authenticateToken,
  updateBookingStatus,
);

// localhost:8001/api/v1/booking/get-my-bookings
router.get("/get-my-bookings", authenticateToken, getMyBookings);

// localhost:8001/api/v1/booking/get-single-booking/:id
router.get("/get-single-booking/:id", authenticateToken, getSingleBooking);


export default router;
