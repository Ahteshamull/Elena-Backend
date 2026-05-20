import express from "express";
import bookingRoutes from "./booking.route.js";

const router = express.Router();

router.use("/booking", bookingRoutes);

export default router;
