import express from "express";

import faq from "./faq.route.js";

const router = express.Router();

// localhost:8001/api/v1/faq/
router.use("/faq", faq);

export default router;
