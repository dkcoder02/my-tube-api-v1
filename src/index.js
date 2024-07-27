import dotenv from "dotenv";
import { app } from "./app.js";
import { connectDB } from "./db/index.js";
dotenv.config({
  path: "./.env",
});

const port = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(port, () => {
      if (process.env.NODE_ENV === "development") {
        console.log(`server is listen at port :: http://localhost:${port}`);
      } else {
        console.log(
          `server is listen at port :: https://chai-backend-cnqk.onrender.com`
        );
      }
    });
  })
  .catch(() => {
    console.log("MONGO db connection failed !!! ", err);
  });
