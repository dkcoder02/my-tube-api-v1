import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!(name || description)) {
    throw new ApiError(400, "name or description is required!");
  }

  const createPlaylist = await Playlist.create({
    owner: req.user._id,
    name,
    description,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Playlist created successfully", createPlaylist)
    );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid Id");
  }

  const playlistAggregate = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
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
                    email: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$owner",
            },
          },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        videos: 1,
        createdAt: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "User playlists fetched successfully",
        playlistAggregate
      )
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid Id");
  }

  const playlists = await Playlist.findById({ _id: playlistId });

  if (!playlists) {
    throw new ApiError(404, "Playlist does not exist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, "User playlists fetched successfully", playlists)
    );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!(isValidObjectId(playlistId) && isValidObjectId(videoId))) {
    throw new ApiError(400, "Invalid Id");
  }

  const existVideo = await Video.findOne({ _id: videoId });

  if (!existVideo) {
    throw new ApiError(404, "video does not exist!");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist does not exist");
  }

  if (playlist) {
    const isVideoExist = playlist.videos.includes(videoId);

    if (isVideoExist) {
      throw new ApiError(400, "Video already exist in the playlist");
    }
  }

  // Add the video to the playlist
  playlist.videos.push(videoId);

  // Save the updated playlist
  await playlist.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Video added to playlist successfully", playlist)
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!(isValidObjectId(playlistId) && isValidObjectId(videoId))) {
    throw new ApiError(400, "Invalid Id");
  }

  const existVideo = await Video.findOne({ _id: videoId });

  if (!existVideo) {
    throw new ApiError(404, "Video does not exist");
  }

  const playlist = await Playlist.findByIdAndUpdate(
    { _id: playlistId },
    {
      $pull: {
        videos: existVideo._id,
      },
    },
    {
      new: true, //return the updated document rather than the original one
    }
  );

  if (!playlist) {
    throw new ApiError(404, "Playlist does not exist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, "video removed to playlist successfully", playlist)
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid Id");
  }

  const playList = await Playlist.findByIdAndDelete({
    _id: playlistId,
  });

  if (!playList) {
    throw new ApiError(400, "Playlist does not exist!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid Id");
  }

  if (!(name && description)) {
    throw new ApiError(400, "name or description is required!");
  }

  const playlist = await Playlist.findByIdAndUpdate(
    {
      _id: playlistId,
    },
    {
      $set: {
        name,
        description,
      },
    },
    {
      new: true,
    }
  );

  if (!playlist) {
    throw new ApiError(400, "Playlist does not exits!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Playlist updated successfully", playlist));
});

export {
  updatePlaylist,
  deletePlaylist,
  getPlaylistById,
  createPlaylist,
  addVideoToPlaylist,
  getUserPlaylists,
  removeVideoFromPlaylist,
};
