import express from "express";
import {
  globalSearch,
  specificSearch,
} from "../controller/search.controller.js";

const router = express.Router();

// localhost:8005/api/v1/search/global-search - Global search with filters
router.get("/global-search", globalSearch);

// localhost:8005/api/v1/search/specific/query-{users,listings,deals,collaborations etc.} and searchType {like:name,email,location,title,etc.}
router.get("/specific", specificSearch);

export default router;
