import { Router } from "express";
import {
  generateRefreshToken,
  logOut,
  loginUser,
  registerUser,
  updateAvatarImage,
  updateCoverImage,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  getUserChannelProfile,
  getWatchHistory,
} from "../controller/user.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJwt } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

router.route("/login").post(loginUser);
router.route("/refresh-token").post(generateRefreshToken);

//secured routes
router.use(verifyJwt);

router.route("/logout").post(logOut);
router.route("/change-password").post(changeCurrentPassword);
router.route("/current-user").get(getCurrentUser);
router.route("/update-account").patch(updateAccountDetails);
router
  .route("/avatar-update")
  .patch(upload.single("avatar"), updateAvatarImage);
router
  .route("/cover-image-update")
  .patch(upload.single("coverImage"), updateCoverImage);
router.route("/channel-profile/:username").get(getUserChannelProfile);
router.route("/history").get(getWatchHistory);

export default router;
