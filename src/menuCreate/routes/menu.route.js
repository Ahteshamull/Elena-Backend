import express from "express";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";
import {
  upload,
  errorCheck,
} from "../../helper/middlewares/imageControlMiddleware.js";
import {
  createMenu,
  getMyMenus,
  getMenusByUserId,
  updateMenu,
  deleteMenu,
} from "../controllers/menu.controller.js";

const router = express.Router();

// Define upload middleware for the single menuImage field
const uploadFields = upload.fields([{ name: "menuImage", maxCount: 1 }]);

// Routes
// POST localhost:8005/api/v1/menu/create-menu - Create a new menu
router.post(
  "/create-menu",
  authenticateToken,
  uploadFields,
  errorCheck,
  createMenu,
);

// GET localhost:8005/api/v1/menu/my-menus - Get logged-in user's menus
router.get("/my-menus", authenticateToken, getMyMenus);

// GET localhost:8005/api/v1/menu/user/:id - Get menus of a specific user/chef
router.get("/user/:id", getMenusByUserId);

// PATCH localhost:8005/api/v1/menu/update-menu/:id - Update a menu
router.patch(
  "/update-menu/:id",
  authenticateToken,
  uploadFields,
  errorCheck,
  updateMenu,
);

// DELETE localhost:8005/api/v1/menu/delete-menu/:id - Delete a menu
router.delete("/delete-menu/:id", authenticateToken, deleteMenu);

export default router;
