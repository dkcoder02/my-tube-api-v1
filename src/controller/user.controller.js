import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteLocalFile } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch {
    throw new ApiError(
      500,
      "something went to wrong while generating AccessToken and RefreshToken"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, userName, email, password } = req.body;

  if (
    [fullName, userName, email, password].some((field) => field.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { userName }],
  });

  if (existedUser) {
    deleteLocalFile(req.files?.avatar[0]?.path);
    throw new ApiError(
      409,
      "User is already register with this email or username"
    );
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "avatar image is missing or invalid");
  }

  const user = await User.create({
    userName,
    fullName,
    avatar: avatar.secure_url,
    coverImage: coverImage?.secure_url || "",
    email,
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "something went to wrong while creating user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, "User register successfully", createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password, userName } = req.body;

  if (!(email || userName)) {
    throw new ApiError(400, "email or username is required");
  }

  const user = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(404, "wrong credentials");
  }

  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  const loggedUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 1);
  const options = {
    httpOnly: true,
    secure: false,
    expires: expiryDate,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, "User logged in successfully", {
        user: loggedUser,
        accessToken,
        refreshToken,
      })
    );
});

const logOut = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User logged out successfully", {}));
});

/**
 * get refreshToken from cookies or req.body
 * not refreshToken throw error
 * decode the refresh token
 * not decode token throw error
 * get user id from decode token and find user ,fire mongodb query through
 * not user throw error
 * compare user refresh token and passed refreshtoken client
 * not match throw error
 * genarate new access token and refresh token
 * store cookie
 * return response
 */
const generateRefreshToken = asyncHandler(async (req, res) => {
  const inComingToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!inComingToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  const decodeToken = Jwt.verify(
    inComingToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  if (!decodeToken) {
    throw new ApiError(401, "Invalid RefreshToken");
  }

  const user = await User.findById(decodeToken?._id);

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  if (inComingToken !== user?.refreshToken) {
    throw new ApiError(401, "Refresh token is expired or used");
  }

  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user?._id);

  const options = {
    httpOnly: true,
    secure: true,
  };

  const newRefreshToken = refreshToken;

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(200, "RefreshToken generated successfully", {
        accessToken,
        refreshToken: newRefreshToken,
      })
    );
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!(oldPassword && newPassword)) {
    throw new ApiError(400, "oldPassword and newPassword is required");
  }

  const user = await User.findById(req.user._id);
  const passwordRight = await user.isPasswordCorrect(oldPassword);

  if (!passwordRight) {
    throw new ApiError(400, "old password is not correct");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "new password and confirm password not match");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, "Current user fetched successFully", req.user));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { email, fullName, userName } = req.body;

  if (!(email || fullName || userName)) {
    throw new ApiError(400, "one of the field is required to update");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        email,
        fullName,
        userName,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, "Account details updated successFully", user));
});

const updateAvatarImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Please attach your avatar image file");
  }
  const avatarLocalFile = req?.file?.path;

  if (!avatarLocalFile) {
    throw new ApiError(400, "Avatar Image file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalFile);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar image on cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, "Avatar image updated successfully", user));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Please attach your cover image file");
  }

  const coverImageLocalFile = req?.file?.path;

  if (!coverImageLocalFile) {
    throw new ApiError(400, "Cover Image file is missing");
  }

  const cover = await uploadOnCloudinary(coverImageLocalFile);

  if (!cover.url) {
    throw new ApiError(400, "Error while uploading cover image on cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: cover.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, "Cover image updated successFully", user));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is required to get channel profile");
  }

  const channel = await User.aggregate([
    {
      $match: {
        userName: username.toLowerCase(),
      },
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

  if (!channel?.length) {
    throw new ApiError(400, "Channel not found with this username");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Channel is fetched successfully", channel[0]));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const watchHistory = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $sort: {
              updatedAt: -1,
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
                  //* video owner info get
                  $project: {
                    fullName: 1,
                    userName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
    {
      $project: {
        password: 0,
        refreshToken: 0,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Watch history fetched successfully",
        watchHistory[0]
      )
    );
});

export {
  registerUser,
  getWatchHistory,
  loginUser,
  logOut,
  generateRefreshToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatarImage,
  updateCoverImage,
  getUserChannelProfile,
};
