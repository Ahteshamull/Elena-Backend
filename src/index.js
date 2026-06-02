import dotenv from "dotenv";

dotenv.config();

import express from "express";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import dbConnect from "./config/database/dbConfig.js";
import router from "./api/index.js";
import cors from "cors";
import { initializeSocket } from "./socket/connection/socket.Connection.js";

const app = express();
app.set("trust proxy", true);

const server = createServer(app);

const PORT = process.env.PORT || 5000;

initializeSocket(server);

app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);

// Stripe Webhook needs raw body - MUST be before express.json()
app.use("/api/v1/payment/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/uploads", express.static("uploads"));

app.use(router);

app.get("/", (req, res) => {
  res.json({
    error: false,
    success: true,
    message: `Welcome to tableli . The backend Server is running on port ${PORT}`,
    version: "v1",
  });
});

dbConnect();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
  console.log(`⚡ Socket.IO server started`);
});
