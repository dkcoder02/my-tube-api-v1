import { faker } from "@faker-js/faker";
import fs from "fs";
import { USERS_COUNT } from "./_constants.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { Playlist } from "../models/playlist.model.js";
import { Subscription } from "../models/subcription.model.js";
import { removeLocalFile } from "../utils/helper.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Array of fake users
const users = new Array(USERS_COUNT).fill("_").map(() => ({
  avatar: faker.image.avatarLegacy(),
  userName: faker.internet.userName(),
  fullName: faker.person.fullName(),
  email: faker.internet.email(),
  password: faker.internet.password(),
}));

const seedUsers = asyncHandler(async (req, res, next) => {
  const userCount = await User.countDocuments();
  if (userCount >= USERS_COUNT) {
    // Don't re-generate the users if we already have them in the database
    next();
    return;
  }
  await User.deleteMany({});
  await Video.deleteMany({});
  await Tweet.deleteMany({});
  await Comment.deleteMany({});
  await Subscription.deleteMany({});
  await Like.deleteMany({});
  await Playlist.deleteMany({});

  removeLocalFile("./public/temp/seed-credentials.json"); // remove old credentials

  const credentials = [];

  // create Promise array
  const userCreationPromise = users.map(async (user) => {
    credentials.push({
      username: user.userName.toLowerCase(),
      email: user.email,
      password: user.password,
    });
    await User.create(user);
  });

  // pass promises array to the Promise.all method
  await Promise.all(userCreationPromise);

  // Once users are created dump the credentials to the json file
  const json = JSON.stringify(credentials);

  fs.writeFileSync(
    "./public/temp/seed-credentials.json",
    json,
    "utf8",
    (err) => {
      console.log("Error while writing the credentials", err);
    }
  );

  // proceed with the request
  next();
});

const getGeneratedCredentials = asyncHandler(async (req, res) => {
  try {
    const json = fs.readFileSync("./public/temp/seed-credentials.json", "utf8");
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Dummy credentials fetched successfully",
          JSON.parse(json)
        )
      );
  } catch (error) {
    throw new ApiError(
      404,
      "No credentials generated yet. Make sure you have seeded social media or ecommerce api data first which generates users as dependencies."
    );
  }
});

export { getGeneratedCredentials, seedUsers };
