import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import morganMiddleware from "./logger/morgan.logger.js";
import { errorHandler } from "./middleware/error.middlewares.js";
import { seedUsers } from "./seeds/user.seeds.js";
import { seedVideo } from "./seeds/video.seeds.js";
import { resetDB } from "./db/index.js";

//! Swagger config
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = fs.readFileSync(path.resolve(__dirname, "./swagger.yaml"), "utf8");
const swaggerDocument = YAML.parse(file);

const app = express();

app.use(
  cors({
    origin: process.env.ORIGIN_URL,
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

//? Request-Response Logger in Terminal
app.use(morganMiddleware);

//* Router Imports

import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import healthcheckRouter from "./routes/healthcheck.routes.js";
import commentRouter from "./routes/comment.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import likeRouter from "./routes/like.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";


app.use("/api/v1/user", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/dashboard", dashboardRouter);

// * Seeding
app.post("/api/v1/seed/video", seedUsers, seedVideo);

// ! 🚫 Danger Zone
app.delete("/api/v1/reset-db", async (req, res) => {
  await resetDB(req, res);
});

app.use(
  "/",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    swaggerOptions: {
      docExpansion: "none",
    },
    customSiteTitle: "YoutubeApi docs",
  })
);

app.use(errorHandler);

export { app };
