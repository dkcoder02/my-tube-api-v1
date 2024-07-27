import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Content is required!");
  }

  const createTweet = await Tweet.create({
    content,
    owner: req.user._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Tweet add to successfully", createTweet));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid Id");
  }

  const existUser = await User.findOne({ _id: userId });

  if (!existUser) {
    throw new ApiError(400, "User does not exist");
  }
  const userTweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
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
              userName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$owner",
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 1,
        content: 1,
        owner: 1,
        createdAt: 1,
      },
    },
  ]);

  if (!userTweets) {
    throw new ApiError(404, "Tweet does not exist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Tweets fetched successfully", userTweets));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid Id");
  }

  if (!content) {
    throw new ApiError(400, "Content is required!");
  }

  const tweet = await Tweet.findByIdAndUpdate(
    {
      _id: tweetId,
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
  if (!tweet) {
    throw new ApiError(400, "Tweet does not exist");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, "Tweet updated successfully", tweet));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid Id");
  }

  const tweet = await Tweet.findByIdAndDelete({
    _id: tweetId,
  });

  if (!tweet) {
    throw new ApiError(400, "Tweet does not exist");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
