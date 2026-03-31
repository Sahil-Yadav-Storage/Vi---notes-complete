import app from "./app.js";
import mongoose from "mongoose";
import { config } from "./config.js";
import cors from 'cors';

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

const allowedOrigins = [
  'https://vi-notes-complete-client-m5ie.vercel.app', // Your Vercel URL
  'http://localhost:5173',                         // Local development
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Crucial for "refresh" tokens/cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));