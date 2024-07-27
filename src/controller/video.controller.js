import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteAssetsOnCloudinary,
} from "../utils/Cloudinary.js";
import { getMongoosePaginationOptions } from "../utils/helper.js";

const uploadVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!(title && description)) {
    throw new ApiError(400, "title and description is required!");
  }
  if (!(req.files.videoFile && req.files.thumbnail)) {
    throw new ApiError(400, "videoFile and thumbnail is required!");
  }

  const videoLocalPath = req.files.videoFile[0].path;
  const thumbnailLocalPath = req.files.thumbnail[0].path;

  const videoFile = await uploadOnCloudinary(videoLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  const uploadVideo = await Video.create({
    title,
    description,
    videoFile: {
      url: videoFile.secure_url,
      publicId: videoFile.public_id,
    },
    thumbnail: {
      url: thumbnail.secure_url,
      publicId: thumbnail.public_id,
    },
    owner: req.user._id,
    duration: videoFile.duration,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, "Upload video successfully", uploadVideo));
});

const changeVideoDetails = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description, isForKids, isRestrict, isPublished } = req.body;

  if (!(title || description)) {
    throw new ApiError(400, "title or description field is required!");
  }

  const video = await Video.findOne({ _id: videoId });

  if (!video) {
    throw new ApiError(404, "Video is not exits");
  }

  const updateVideo = await Video.findByIdAndUpdate(
    { _id: videoId },
    {
      title,
      description,
      isForKids: isForKids || 0,
      isRestrict: isRestrict || 0,
      isPublished,
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Video updated successfully", updateVideo));
});

const changeUploadVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Id");
  }
  if (!req.file) {
    throw new ApiError(400, "video file is required!");
  }

  const videoLocalPath = req.file.path;

  const exitsVideo = await Video.findOne({ _id: videoId });

  if (!exitsVideo) {
    throw new ApiError(404, "video does not exits!");
  }

  await deleteAssetsOnCloudinary({
    publicId: exitsVideo.videoFile[0].publicId,
    fileType: "video",
  });

  const videoFile = await uploadOnCloudinary(videoLocalPath);

  const updateVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        videoFile: {
          url: videoFile.secure_url,
          publicId: videoFile.public_id,
        },
        duration: videoFile.duration,
      },
    },
    {
      new: true,
    }
  ).select("videoFile duration");

  return res
    .status(200)
    .json(new ApiResponse(200, "video file updated successfully", updateVideo));
});

const changeUploadThumbnail = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Id");
  }

  if (!req.file) {
    throw new ApiError(400, "thumbnail file is required!");
  }

  const thumbnailLocalPath = req.file.path;

  const exitsVideo = await Video.findOne({ _id: videoId });

  if (!exitsVideo) {
    throw new ApiError(404, "Video is not exits");
  }

  await deleteAssetsOnCloudinary({
    publicId: exitsVideo.thumbnail[0].publicId,
    fileType: "image",
  });

  const thumbnailFile = await uploadOnCloudinary(thumbnailLocalPath);

  const updateVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        thumbnail: {
          url: thumbnailFile.secure_url,
          publicId: thumbnailFile.public_id,
        },
      },
    },
    {
      new: true,
    }
  ).select("thumbnail");

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Thumbnail file is update successfully", updateVideo)
    );
});

const getUserVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Id");
  }

  const videoAggregate = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "Subscribers",
            },
          },
          {
            $addFields: {
              isSubscribe: {
                $cond: {
                  if: { $in: [req.user._id, "$Subscribers.subscriber"] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              _id: 1,
              avatar: 1,
              userName: 1,
              isSubscribe: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$owner",
    },
    {
      $project: {
        _id: 1,
        videoFile: 1,
        thumbnail: 1,
        duration: 1,
        description: 1,
        views: 1,
        isPublished: 1,
        createdAt: 1,
        title: 1,
        owner: 1,
        likes: { $size: "$likes" },
        isLiked: {
          $cond: {
            if: { $in: [req.user._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
  ]);
  if (!videoAggregate[0]) {
    throw new ApiError(404, "video does not exits");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Video fetched successfully", videoAggregate[0])
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Id");
  }
  const video = await Video.findOne({ _id: videoId });

  if (!video) {
    throw new ApiError(404, "video is not exits");
  }

  await deleteAssetsOnCloudinary({
    publicId: video.videoFile[0].publicId,
    fileType: "video",
  });

  await deleteAssetsOnCloudinary({
    publicId: video.thumbnail[0].publicId,
    fileType: "image",
  });

  await Video.deleteOne({ _id: videoId });
  return res
    .status(200)
    .json(new ApiResponse(200, "Video deleted successfully"));
});

const watchVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Id");
  }

  if (!videoId) {
    throw new ApiError(400, "Missing video id!");
  }

  const video = await Video.findById({ _id: videoId });

  if (!video) {
    throw new ApiError(404, "video does not exits");
  }

  const user = await User.findOne({
    _id: req.user._id,
  }).select("watchHistory");

  const watchedVideo = user.watchHistory.filter(
    (video) => video.toHexString() === videoId
  );

  if (watchedVideo && watchedVideo.length !== 0) {
    return res.status(200).json(new ApiResponse(200, "Video already watched"));
  }

  video.views += 1;
  video.updatedAt = new Date();

  await User.updateOne(
    { _id: req.user._id },
    { $push: { watchHistory: video._id } }
  );

  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, "Video watched successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { publishMessage } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Id");
  }

  if (!videoId) {
    throw new ApiError(400, "Missing video id!");
  }

  const exitVideo = await Video.findById(videoId);

  if (!exitVideo) {
    throw new ApiError(404, "Video does not exits");
  }

  const updateVideo = await Video.findByIdAndUpdate(
    { _id: videoId },
    {
      $set: {
        isPublished: publishMessage,
      },
    },
    { new: true }
  ).select("isPublished");

  if (!updateVideo) {
    throw new ApiError(400, "Video publish status not updated!");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Video publish status updated successfully",
        updateVideo
      )
    );
});

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 1000, sortBy, sortType, userId } = req.query;

  const allVideosAggregate = Video.aggregate([
    {
      $match: {
        isPublished: true,
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $project: {
        _id: 1,
        videoFile: 1,
        thumbnail: 1,
        description: 1,
        duration: 1,
        views: 1,
        isPublished: 1,
        createdAt: 1,
        title: 1,
        owner: 1,
        likes: { $size: "$likes" },
        isLiked: {
          $cond: {
            if: { $in: [req.user._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "Subscribers",
            },
          },
          {
            $addFields: {
              isSubscribe: {
                $cond: {
                  if: { $in: [req.user._id, "$Subscribers.subscriber"] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              _id: 1,
              avatar: 1,
              userName: 1,
              isSubscribe: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$owner",
    },
  ]);

  let videosAggregate = allVideosAggregate;

  // If userId is provided, filter videos by owner
  if (userId || sortBy) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid Id");
    }
    const existUser = await User.findById({ _id: userId });

    if (!existUser) {
      throw new ApiError(404, "User does not exits");
    }

    const userVideosAggregate = Video.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(existUser._id),
        },
      },
      {
        $sort: {
          createdAt: sortBy === "asc" ? 1 : -1,
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "likes",
        },
      },
      {
        $project: {
          _id: 1,
          videoFile: 1,
          thumbnail: 1,
          duration: 1,
          description: 1,
          views: 1,
          isPublished: 1,
          createdAt: 1,
          title: 1,
          owner: 1,
          likes: { $size: "$likes" },
          isLiked: {
            $cond: {
              if: { $in: [req.user._id, "$likes.likedBy"] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            {
              $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "Subscribers",
              },
            },
            {
              $addFields: {
                isSubscribe: {
                  $cond: {
                    if: { $in: [req.user._id, "$Subscribers.subscriber"] },
                    then: true,
                    else: false,
                  },
                },
              },
            },
            {
              $project: {
                _id: 1,
                avatar: 1,
                userName: 1,
                isSubscribe: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: "$owner",
      },
    ]);

    videosAggregate = userVideosAggregate;
  }

  if (sortType == "uploadDate") {
    const sortVideosByUploadDateAggregate = Video.aggregate([
      {
        $match: {
          isPublished: true,
        },
      },
      {
        $sort: {
          createdAt: sortBy === "asc" ? 1 : -1,
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "likes",
        },
      },
      {
        $project: {
          _id: 1,
          videoFile: 1,
          thumbnail: 1,
          duration: 1,
          description: 1,
          views: 1,
          isPublished: 1,
          createdAt: 1,
          title: 1,
          owner: 1,
          likes: { $size: "$likes" },
          isLiked: {
            $cond: {
              if: { $in: [req.user._id, "$likes.likedBy"] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            {
              $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "Subscribers",
              },
            },
            {
              $addFields: {
                isSubscribe: {
                  $cond: {
                    if: { $in: [req.user._id, "$Subscribers.subscriber"] },
                    then: true,
                    else: false,
                  },
                },
              },
            },
            {
              $project: {
                _id: 1,
                avatar: 1,
                userName: 1,
                isSubscribe: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: "$owner",
      },
    ]);
    videosAggregate = sortVideosByUploadDateAggregate;
  }

  // If sortType is "viewCount", sort videos by views
  if (sortType == "viewCount") {
    const sortVideosByViewCountAggregate = Video.aggregate([
      {
        $sort: {
          views: sortBy === "asc" ? 1 : -1,
        },
      },
    ]);
    videosAggregate = sortVideosByViewCountAggregate;
  }

  // Fetch videos using aggregate pagination
  const videos = await Video.aggregatePaginate(
    videosAggregate,
    getMongoosePaginationOptions({
      page,
      limit,
      customLabels: {
        docs: "videos",
        totalDocs: "totalVideos",
      },
    })
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "videos fetched successfully", videos));
});

const getVideoAppVideos = asyncHandler(async (req, res) => {
  const { sortBy } = req.query;

  const allVideosAggregate = await Video.aggregate([
    {
      $match: {
        isPublished: true,
      },
    },
    {
      $sort: {
        createdAt: sortBy === "asc" ? 1 : -1,
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $project: {
        _id: 1,
        videoFile: 1,
        thumbnail: 1,
        description: 1,
        duration: 1,
        views: 1,
        isPublished: 1,
        createdAt: 1,
        title: 1,
        owner: 1,
        likes: { $size: "$likes" },
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              _id: 0,
              avatar: 1,
              userName: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$owner",
    },
  ]);

  const videos = allVideosAggregate;

  return res
    .status(200)
    .json(new ApiResponse(200, "videos fetched successfully", { videos }));
});

export {
  uploadVideo,
  getUserVideoById,
  deleteVideo,
  changeVideoDetails,
  changeUploadVideo,
  changeUploadThumbnail,
  watchVideo,
  togglePublishStatus,
  getAllVideos,
  getVideoAppVideos,
};
