import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Id");
  }

  const existVideo = await Video.findOne({ _id: videoId });

  if (!existVideo) {
    throw new ApiError(400, "Video does not exist!");
  }
  // See if user has already liked the video
  const isAlreadyLiked = await Like.findOne({
    video: videoId,
    likedBy: userId,
  });

  if (isAlreadyLiked) {
    //* if already liked, dislike it by removing the record from the DB
    await Like.findOneAndDelete({
      video: videoId,
      likedBy: userId,
    });
    return res.status(200).json(
      new ApiResponse(200, "Video disLiked successfully", {
        isLiked: false,
      })
    );
  } else {
    //* if not liked, like it by adding the record from the DB
    await Like.create({
      video: videoId,
      likedBy: userId,
    });
    return res.status(200).json(
      new ApiResponse(200, "Video Liked successfully", {
        isLiked: true,
      })
    );
  }
});

const videoDislike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Id");
  }

  await Like.findOneAndDelete({
    video: videoId,
    likedBy: userId,
  });
  return res.status(200).json(
    new ApiResponse(200, "Video disLiked successfully", {
      isLiked: false,
    })
  );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid Id");
  }

  const userId = req.user._id;

  const existComment = await Comment.findOne({ _id: commentId });

  if (!existComment) {
    throw new ApiError(400, "Comment does not exist!");
  }

  // See if user has already liked the comment
  const isAlreadyLiked = await Like.findOne({
    comment: commentId,
    likedBy: userId,
  });

  if (isAlreadyLiked) {
    // remove like on comment
    await Like.findOneAndDelete({
      comment: commentId,
      likedBy: userId,
    });

    return res.status(200).json(
      new ApiResponse(200, "Comment disLiked successfully", {
        isLiked: false,
      })
    );
  } else {
    // add like on comment
    await Like.create({
      comment: commentId,
      likedBy: userId,
    });
    return res.status(200).json(
      new ApiResponse(200, "Comment liked successfully", {
        isLiked: true,
      })
    );
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid Id");
  }
  const userId = req.user._id;

  const existTweet = await Tweet.findOne({ _id: tweetId });

  if (!existTweet) {
    throw new ApiError(400, "Tweet does not exist!");
  }

  // See if user has already liked the tweet
  const isAlreadyLiked = await Like.findOne({
    tweet: tweetId,
    likedBy: userId,
  });

  if (isAlreadyLiked) {
    // remove like on tweet
    await Like.findOneAndDelete({
      tweet: tweetId,
      likedBy: userId,
    });

    return res.status(200).json(
      new ApiResponse(200, "Tweet disLiked successfully", {
        isLiked: false,
      })
    );
  } else {
    // add like on tweet
    await Like.create({
      tweet: tweetId,
      likedBy: userId,
    });
    return res.status(200).json(
      new ApiResponse(200, "Tweet liked successfully", {
        isLiked: true,
      })
    );
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const getUserAllLikedVideo = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedvideos",
      },
    },
    {
      $unwind: {
        path: "$likedvideos",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "likedvideos.owner",
        foreignField: "_id",
        as: "likedvideos.owner",
        pipeline: [
          {
            $project: {
              userName: 1,
              email: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$likedvideos.owner",
      },
    },
    {
      $group: {
        _id: null, // Grouping all results into one
        likedvideos: {
          $push: "$likedvideos",
        },
      },
    },
    {
      $project: {
        _id: 0,
        likedvideos: 1,
      },
    },
  ]);

  if (!getUserAllLikedVideo.length > 0) {
    throw new ApiError(404, "No liked videos found!");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Channel liked video fetched successfully",
        getUserAllLikedVideo
      )
    );
});

export {
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
  getLikedVideos,
  videoDislike,
};
