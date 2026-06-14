import express from "express";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";
import { getConversations, getMessages, createConversation } from "../controller/conversition.controller.js";

const router = express.Router();

// GET /api/v1/conversations
router.get("/", authenticateToken, getConversations);

// POST /api/v1/conversations
router.post("/", authenticateToken, createConversation);

// GET /api/v1/conversations/:conversationId/messages
router.get("/:conversationId/messages", authenticateToken, getMessages);

export default router;
