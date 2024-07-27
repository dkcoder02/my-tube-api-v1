import { Router } from "express";
import {
  changeUploadThumbnail,
  changeUploadVideo,
  changeVideoDetails,
  deleteVideo,
  getUserVideoById,
  uploadVideo,
  watchVideo,
  togglePublishStatus,
  getAllVideos,
  getVideoAppVideos,
} from "../controller/video.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJwt } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/app").get(getVideoAppVideos);

//secured routes
router.use(verifyJwt);

router.route("/result").get(getAllVideos);
router.route("/upload").post(
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  uploadVideo
);

router
  .route("/:videoId")
  .get(getUserVideoById)
  .patch(changeVideoDetails)
  .delete(deleteVideo);

router
  .route("/change-upload-video/:videoId")
  .patch(upload.single("videoFile"), changeUploadVideo);
router
  .route("/change-upload-thumbnail/:videoId")
  .patch(upload.single("thumbnail"), changeUploadThumbnail);
router.route("/watch/:videoId").patch(watchVideo);
router.route("/toggle/publish/:videoId").patch(togglePublishStatus);

export default router;
