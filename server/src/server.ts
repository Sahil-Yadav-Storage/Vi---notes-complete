import app from "./app.js";
import mongoose from "mongoose";
import { config } from "./config.js";
import cors from 'cors';

// Define the exact origin of your Vercel app (NO trailing slash)
const allowedOrigin = 'https://vi-notes-complete-client-m5ie.vercel.app';

app.use(cors({
  origin: [allowedOrigin, 'http://localhost:5173'], // Allow production and local dev
  credentials: true,                              // Required for /auth/refresh (cookies/tokens)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.options('*', cors());
// Important: Place this ABOVE your route definitions

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
app.get('/', (req, res) => {
  res.send('Server is running and healthy!');
});