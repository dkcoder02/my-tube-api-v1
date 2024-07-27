import { Router } from "express";
import {
  getChannelStats,
  getChannelVideos,
} from "../controller/dashboard.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJwt); // Protect all routes with JWT verification

router.route("/stats").get(getChannelStats);
router.route("/videos").get(getChannelVideos);

export default router;
