import app from "./app.js";
import mongoose from "mongoose";
import { config } from "./config.js";

const PORT = process.env.PORT || 10000;

mongoose
  .connect(config.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${config.PORT}`);
    });
  })
  .catch(console.error);
