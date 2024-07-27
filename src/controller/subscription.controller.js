import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subcription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid Id");
  }

  // See if user has already subscription
  const isAlreadySubscription = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelId,
  });

  if (isAlreadySubscription) {
    await Subscription.findOneAndDelete({
      subscriber: req.user._id,
      channel: channelId,
    });
    return res.status(200).json(
      new ApiResponse(200, "Channel unsubscribed successfully", {
        Subscribed: false,
      })
    );
  } else {
    await Subscription.create({
      subscriber: req.user._id,
      channel: channelId,
    });
    return res.status(200).json(
      new ApiResponse(200, "Channel subscribed successfully", {
        Subscribed: true,
      })
    );
  }
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid Id");
  }

  const channelSubscriberList = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscribeUser",
        pipeline: [
          {
            $project: {
              userName: 1,
              email: 1,
              avatar: 1,
              fullName: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$subscribeUser",
      },
    },
    {
      $group: {
        _id: null,
        subscribeUsers: { $push: "$subscribeUser" },
      },
    },
    {
      $project: {
        _id: 0,
        subscribeUsers: 1,
      },
    },
  ]);
  if (channelSubscriberList.length === 0) {
    throw new ApiError(404, "channel subscriber not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Channel all subscriber list fetched successfully",
        channelSubscriberList[0]
      )
    );
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid Id");
  }

  const userSubscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "subscribedChannels",
        pipeline: [
          {
            $project: {
              fullName: 1,
              avatar: 1,
              coverImage: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$subscribedChannels",
      },
    },
    {
      $group: {
        _id: null,
        subscribedChannels: { $push: "$subscribedChannels" },
      },
    },
    {
      $project: {
        _id: 0,
        subscribedChannels: 1,
      },
    },
  ]);

  if (userSubscribedChannels.length === 0) {
    throw new ApiError(404, "User subscribed channels not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "User subscribed channels list fetched successfully",
        userSubscribedChannels[0]
      )
    );
});

const getChannelList = asyncHandler(async (req, res) => {
  const channelList = await User.aggregate([
    {
      $match: {},
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "SubscribedTo",
      },
    },
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
        subscribersCount: {
          $size: "$Subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$SubscribedTo",
        },
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
        fullName: 1,
        userName: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribe: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, "All channel list fetched successfully", channelList)
    );
});

export {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels,
  getChannelList,
};
