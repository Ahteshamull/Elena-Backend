import express from "express";
import {
  authenticateToken,
  requireChefRole,
} from "../../helper/middlewares/auth.middleware.js";
import {
  createBooking,
  getClientBookings,
  getChefBookings,
  getBookingDetails,
  updateBookingStatus,
  getAllBookings,
} from "../controllers/booking.controller.js";

const router = express.Router();

// GET /api/v1/booking/all - Get all bookings (Admin/SuperAdmin only)
router.get("/all", authenticateToken, getAllBookings);

// POST /api/v1/booking/:chefId - Create a new chef booking (Private)
router.post("/:chefId", authenticateToken, createBooking);

// GET /api/v1/booking/client - Get all bookings created by the logged-in client
// GET /api/v1/booking/client/:status - Get bookings by status
router.get("/client", authenticateToken, getClientBookings);
router.get("/client/:status", authenticateToken, getClientBookings);

// GET /api/v1/booking/chef - Get all bookings received by the logged-in chef
// GET /api/v1/booking/chef/:status - Get bookings by status
router.get("/chef", authenticateToken, requireChefRole, getChefBookings);
router.get("/chef/:status", authenticateToken, requireChefRole, getChefBookings);

// GET /api/v1/booking/:id - Get details of a single booking (Private)
router.get("/:id", authenticateToken, getBookingDetails);

// PATCH /api/v1/booking/:id/status - Update booking status (Private)
router.patch("/:id/status", authenticateToken, updateBookingStatus);

export default router;
