import express from "express";
import {
  createReview,
  userPersonalReview,
  userReview,
  deleteReview,
  allReviews,
} from "../controller/review.controller.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";

const router = express.Router();

// localhost:8005/api/v1/review/create-review/:collaborationId
router.post("/create-review/:collaborationId", authenticateToken, createReview);

// http://localhost:8005/api/v1/review/user-personal
router.get("/user-personal", authenticateToken, userPersonalReview);

// localhost:8005/api/v1/review/user/:userId
router.get("/user/:userId", authenticateToken, userReview);

// localhost:8005/api/v1/review/delete/:reviewId
router.delete("/delete/:reviewId", authenticateToken, deleteReview);

// localhost:8005/api/v1/review/all-reviews
router.get("/all-reviews", authenticateToken, allReviews);

export default router;
