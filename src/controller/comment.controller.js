import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const videosCommentAggregate = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
        pipeline: [
          {
            $sort: {
              createdAt: -1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$comments",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "comments.owner",
        foreignField: "_id",
        as: "comments.owner",
      },
    },

    {
      $unwind: {
        path: "$comments.owner",
      },
    },
    {
      $group: {
        _id: "$_id",
        title: { $first: "$title" },
        description: { $first: "$description" },
        thumbnail: { $first: "$thumbnail" },
        videoFile: { $first: "$videoFile" },
        owner: { $first: "$owner" },
        views: { $first: "$views" },
        createdAt: { $first: "$createdAt" },
        updatedAt: { $first: "$updatedAt" },
        comments: { $push: "$comments" },
      },
    },

    {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        thumbnail: 1,
        videoFile: 1,
        owner: 1,
        views: 1,
        createdAt: 1,
        updatedAt: 1,
        comments: {
          _id: 1,
          content: 1,
          owner: {
            _id: 1,
            userName: 1,
            email: 1,
            avatar: 1,
            fullName: 1,
          },
          createdAt: 1,
          updatedAt: 1,
        },
      },
    },
  ]);

  const videoComments = videosCommentAggregate[0];

  if (!videoComments) {
    throw new ApiError(404, "Video does not exist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Video comments fetched successfully", videoComments)
    );
});

const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Id");
  }

  const video = await Video.findById({ _id: videoId });

  if (!video) {
    throw new ApiError(400, "Video does not exist");
  }

  if (!content) {
    throw new ApiError(400, "Content is required!");
  }

  const createComment = await Comment.create({
    content,
    video: videoId,
    owner: req.user._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Comment add to successfully", createComment));
});

const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid Id");
  }

  if (!content) {
    throw new ApiError(400, "Content is required!");
  }

  const comment = await Comment.findByIdAndUpdate(
    {
      _id: commentId,
    },
    {
      $set: {
        content: content,
      },
    },
    {
      new: true,
    }
  );

  if (!comment) {
    throw new ApiError(400, "Comment does not exist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Comment updated to successfully", comment));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid Id");
  }

  const comment = await Comment.findByIdAndDelete({
    _id: commentId,
  });

  if (!comment) {
    throw new ApiError(400, "Comment does not exist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Comment deleted to successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
