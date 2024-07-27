import { faker } from "@faker-js/faker";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getRandomNumber } from "../utils/helper.js";
import {
  COMMENTS_COUNT,
  PLAYLISTS_COUNT,
  TWEETS_COUNT,
  VIDEOS_COUNT,
} from "./_constants.js";
import { Comment } from "../models/comment.model.js";
import { Playlist } from "../models/playlist.model.js";
import { Like } from "../models/like.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Subscription } from "../models/subcription.model.js";

const videosUrl = [
  "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
  "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
  "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4",
  "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
  "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4",
];

// Generate fake videos
const videos = new Array(VIDEOS_COUNT).fill("_").map(() => {
  return {
    videoFile: [
      {
        url: videosUrl[getRandomNumber(videosUrl.length)],
        publicId: faker.string.uuid(),
      },
    ],
    thumbnail: [
      {
        url: faker.image.url(640, 480, "people", true),
        publicId: faker.string.uuid(),
      },
    ],
    title: faker.lorem.sentence(5),
    description: faker.lorem.paragraph(10),
    duration: faker.number.int({ min: 1, max: 120 }),
    views: faker.number.int({ min: 0, max: 10000 }),
    isForKids: faker.datatype.boolean() ? 1 : 0,
    isRestrict: faker.datatype.boolean() ? 1 : 0,
  };
});

// Generate fake comment
const comments = new Array(COMMENTS_COUNT).fill("_").map(() => {
  return {
    content: faker.lorem.paragraph(10),
  };
});

// Generate fake playlist
const playlists = new Array(PLAYLISTS_COUNT).fill("_").map(() => {
  return {
    name: faker.lorem.words(3),
    description: faker.lorem.paragraph(5),
  };
});

// generate fake Tweets
const tweets = new Array(TWEETS_COUNT).fill("_").map(() => {
  return {
    content: faker.lorem.paragraph(10),
  };
});

const seedVideosData = async () => {
  const users = await User.find();
  await Video.deleteMany({});
  await Comment.deleteMany({});
  await Video.insertMany(
    videos.map((video) => ({
      ...video,
      owner: users[getRandomNumber(users.length)], // set random user as a owner
    }))
  );
};

const seedCommentsData = async () => {
  const users = await User.find();
  const _videos = await Video.find();
  await Comment.deleteMany({});
  await Comment.insertMany(
    comments.map((comment) => ({
      ...comment,
      owner: users[getRandomNumber(users.length)],
      video: _videos[getRandomNumber(_videos.length)],
    }))
  );
};

const seedPlaylistsData = async () => {
  const users = await User.find();
  const _videos = await Video.find();
  await Playlist.deleteMany({});
  await Playlist.insertMany(
    playlists.map((playlist) => ({
      ...playlist,
      owner: users[getRandomNumber(users.length)],
      videos: _videos.slice(0, getRandomNumber(_videos.length)),
    }))
  );
};

const seedLikesData = async () => {
  const users = await User.find();
  const _videos = await Video.find();
  await Like.deleteMany({});
  await Like.insertMany(
    _videos.map((video) => ({
      video: _videos[getRandomNumber(_videos.length)],
      likedBy: users[getRandomNumber(users.length)],
    }))
  );
};

const seedTweetsData = async () => {
  const users = await User.find();
  await Tweet.deleteMany({});
  await Tweet.insertMany(
    tweets.map((tweet) => ({
      ...tweet,
      owner: users[getRandomNumber(users.length)],
    }))
  );
};

const seedSubscriptionsData = async () => {
  const users = await User.find();
  await Subscription.deleteMany({});
  await Subscription.insertMany(
    users.map((user) => ({
      subscriber: users[getRandomNumber(users.length)],
      channel: users[getRandomNumber(users.length)],
    }))
  );
};

const seedVideo = asyncHandler(async (req, res) => {
  await seedVideosData();
  await seedCommentsData();
  await seedPlaylistsData();
  await seedLikesData();
  await seedTweetsData();
  await seedSubscriptionsData();
  return res
    .status(201)
    .json(
      new ApiResponse(201, {}, "Database populated for video successfully")
    );
});

export { seedVideo };
