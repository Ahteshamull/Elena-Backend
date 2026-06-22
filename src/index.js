import dotenv from "dotenv";
import os from "os";

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
app.use("/api/v1/uploads", express.static("uploads")); // To support images prefixed with VITE_BASE_URL

app.use(router);

app.get("/", (req, res) => {
  const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
  const freeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
  const usedRam = (totalRam - freeRam).toFixed(2);
  const cpuCount = os.cpus().length;
  const uptime = (os.uptime() / 3600).toFixed(2);

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Server Status</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #121212; color: #e0e0e0; margin: 0; padding: 40px; display: flex; justify-content: center; }
        .container { width: 100%; max-width: 600px; background: #1e1e1e; padding: 30px; border-radius: 12px; box-shadow: 0 8px 16px rgba(0,0,0,0.5); }
        h1 { color: #ffffff; text-align: center; margin-bottom: 30px; font-weight: 300; }
        .stat-box { background: #2c2c2c; padding: 20px; margin-bottom: 20px; border-radius: 8px; border-left: 6px solid #4caf50; display: flex; justify-content: space-between; align-items: center; }
        .stat-title { font-weight: 600; color: #9e9e9e; text-transform: uppercase; font-size: 0.85em; letter-spacing: 1px; }
        .stat-value { font-size: 1.4em; color: #ffffff; font-weight: 500; }
        .progress-bar-bg { width: 100%; background-color: #424242; border-radius: 4px; margin-top: 10px; overflow: hidden; }
        .progress-bar { height: 8px; background-color: #4caf50; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>AWS-like Server Status Dashboard</h1>
        
        <div class="stat-box" style="display: block;">
          <div style="display: flex; justify-content: space-between;">
            <div class="stat-title">Memory (RAM) Usage</div>
            <div class="stat-value" style="font-size: 1.1em;">${usedRam} GB / ${totalRam} GB</div>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar" style="width: ${(usedRam / totalRam) * 100}%"></div>
          </div>
          <div style="margin-top: 8px; font-size: 0.85em; color: #9e9e9e; text-align: right;">Free: ${freeRam} GB</div>
        </div>

        <div class="stat-box">
          <div class="stat-title">CPU Cores</div>
          <div class="stat-value">${cpuCount}</div>
        </div>

        <div class="stat-box">
          <div class="stat-title">System Uptime</div>
          <div class="stat-value">${uptime} Hours</div>
        </div>

        <div class="stat-box">
          <div class="stat-title">Server Port</div>
          <div class="stat-value">${PORT}</div>
        </div>
      </div>
    </body>
    </html>
  `;
  res.send(html);
});

dbConnect();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
  console.log(`⚡ Socket.IO server started`);
});
