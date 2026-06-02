import express from "express";

import payment from "./payment.route.js";

const router = express.Router();

// localhost:8005/api/v1/payment/
router.use("/payment", payment);

export default router;
