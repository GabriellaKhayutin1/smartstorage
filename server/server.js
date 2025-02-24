import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "../routes/authRoutes.js";  // ✅ Correct

dotenv.config();
const app = express();

// ✅ Enable CORS for frontend requests
app.use(cors({
    origin: "http://127.0.0.1:5501",
    credentials: true
}));

// ✅ Middleware
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// ✅ Routes
app.use("/api/auth", authRoutes);

// ✅ Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
