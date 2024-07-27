import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import fs from "fs";

export let mongoDBInstance = undefined;
const connectDB = async () => {
  try {
    const dbInstance = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
    );
    mongoDBInstance = dbInstance;
    console.log(`Db connected Successfully :: ${dbInstance.connection.host}`);
  } catch (error) {
    console.log("MongoDb Connection Error::", error);
    process.exit(1);
  }
};

const resetDB = async (req, res) => {
  if (mongoDBInstance) {
    await mongoDBInstance.connection.db.dropDatabase({
      dbName: DB_NAME,
    });

    // remove the seeded users if exist
    fs.unlink("./public/temp/seed-credentials.json", (err) => {
      // fail silently
      if (err) console.log("Seed credentials are missing.");
    });
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Database dropped successfully"));
  }
  throw new ApiError(500, "Something went wrong while dropping the database");
};

export { connectDB, resetDB };
