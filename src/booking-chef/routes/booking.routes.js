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
} from "../controllers/booking.controller.js";

const router = express.Router();

// POST /api/v1/booking/:chefId - Create a new chef booking (Private)
router.post("/:chefId", authenticateToken, createBooking);

// GET /api/v1/booking/client - Get bookings created by the logged-in client (Private)
router.get("/client", authenticateToken, getClientBookings);

// GET /api/v1/booking/chef - Get bookings received by the logged-in chef (Private, Chef only)
router.get("/chef", authenticateToken, requireChefRole, getChefBookings);

// GET /api/v1/booking/:id - Get details of a single booking (Private)
router.get("/:id", authenticateToken, getBookingDetails);

// PATCH /api/v1/booking/:id/status - Update booking status (Private)
router.patch("/:id/status", authenticateToken, updateBookingStatus);

export default router;
