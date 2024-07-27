import { Router } from "express";
import {
  getChannelList,
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controller/subscription.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";

const router = Router();
router.use(verifyJwt); // Apply verifyJWT middleware to all routes in this file

router
  .route("/c/:channelId")
  .get(getSubscribedChannels)
  .post(toggleSubscription);

router.route("/u/:subscriberId").get(getUserChannelSubscribers);
router.route("/channels").get(getChannelList);

export default router;
