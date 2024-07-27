import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getMongoosePaginationOptions } from "../utils/helper.js";
import { Subscription } from "../models/subcription.model.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const totalSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $group: {
        _id: "$channel",
        totalSubscribers: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
  ]);

  const channelDashboardStats = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user._id),
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
      $addFields: {
        likesCount: { $size: "$likes" },
      },
    },
    {
      $group: {
        _id: null,
        totalViews: { $sum: "$views" },
        totalVideos: { $sum: 1 },
        totalLikes: { $sum: "$likesCount" },
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
  ]);

  const dashboardStats = {
    totalVideos: channelDashboardStats[0]?.totalVideos || 0,
    totalLikes: channelDashboardStats[0]?.totalLikes || 0,
    totalViews: channelDashboardStats[0]?.totalViews || 0,
    totalSubscribers: totalSubscribers[0]?.totalSubscribers || 0,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Get the channel stats info fetched successfully",
        dashboardStats
      )
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const { page = process.env.DEFAULT_PAGE, limit = process.env.DEFAULT_LIMIT } =
    req.query;

  const videoUploadByChannel = Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user._id),
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
      $addFields: {
        likes: {
          $size: "$likes",
        },
      },
    },
    {
      $project: {
        createdAt: 0,
      },
    },
  ]);

  const videos = await Video.aggregatePaginate(
    videoUploadByChannel,
    getMongoosePaginationOptions({
      page,
      limit,
      customLabels: {
        docs: "channelVideos",
        totalDocs: "totalVideos",
      },
    })
  );

  if (!videos) {
    throw new ApiError(404, "Videos does not exist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Get the channel upload video fetched successfully",
        videos
      )
    );
});

export { getChannelStats, getChannelVideos };
