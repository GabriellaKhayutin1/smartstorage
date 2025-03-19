import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import session from "express-session";
import path from "path";
import { google } from "googleapis";
import jwt from "jsonwebtoken";

import authRoutes from "./routes/authRoutes.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import profileRoutes from "./routes/profileRoutes.js";
import authenticate from "./middleware/authMiddleware.js";
import Ingredient from "./models/Ingredient.js";
import User from "./models/User.js";

dotenv.config(); // Load environment variables
const app = express();

// ✅ CORS Configuration (Fixing Issues)
const corsOptions = {
    origin: "http://127.0.0.1:5501", // ✅ Allow requests from frontend
    credentials: true, // ✅ Allow cookies & authentication
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};
app.use(cors(corsOptions));

// ✅ Explicitly Handle Preflight Requests
app.options("*", (req, res) => {
    res.header("Access-Control-Allow-Origin", "http://127.0.0.1:5501");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    res.status(204).end(); // Respond with 204 No Content
});

// ✅ Middleware
app.use(express.json());
app.use(cookieParser());

// ✅ Serve static files from the public directory
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

// ✅ Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/profile", profileRoutes);

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// ✅ Google OAuth2 Client Setup
const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:5003/oauthcallback"
);

// ✅ Google OAuth Flow for Login
app.get("/auth/google", (req, res) => {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/calendar"
        ],
    });
    res.redirect(authUrl);
});

// ✅ OAuth Callback to Receive Tokens
app.get("/oauthcallback", async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) throw new Error("No authorization code received");

        const { tokens } = await oAuth2Client.getToken(code);
        if (!tokens.access_token) throw new Error("Failed to retrieve access token");

        console.log("✅ Tokens received:", tokens);
        oAuth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ version: "v2", auth: oAuth2Client });
        const userInfo = await oauth2.userinfo.get();
        const email = userInfo.data.email;

        // Check if user exists in DB, create if not
        let user = await User.findOne({ email });
        if (!user) {
            user = new User({
                googleId: userInfo.data.id,
                email,
                refreshToken: tokens.refresh_token
            });
        } else {
            user.refreshToken = tokens.refresh_token || user.refreshToken;
        }
        await user.save();

        // Generate a JWT for the user
        const jwtToken = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        // Set the access token in an HTTP-only cookie
        res.cookie("access_token", tokens.access_token, {
            httpOnly: true, // Prevents JavaScript from accessing the cookie
            secure: process.env.NODE_ENV === 'production', // Only set 'secure' flag in production
            maxAge: 3600 * 1000 // Token expiration time (1 hour)
        });

        res.redirect(`http://127.0.0.1:5501/index.html?token=${jwtToken}`);
    } catch (error) {
        console.error("❌ OAuth Callback Error:", error);
        res.status(500).send("Authentication failed.");
    }
});

// ✅ Fetch Ingredients using Authenticated User
app.get("/api/ingredients", authenticate, async (req, res) => {
    try {
        console.log("🔎 Fetching ingredients for user:", req.user.userId);
        const ingredients = await Ingredient.find({ userId: req.user.userId });
        res.json(ingredients);
    } catch (error) {
        console.error("❌ Error fetching ingredients:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ Refresh Access Token using Stored Refresh Token
app.get("/refresh_token", authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user || !user.refreshToken) {
            return res.status(400).json({ error: "No refresh token found" });
        }

        oAuth2Client.setCredentials({ refresh_token: user.refreshToken });
        const { credentials } = await oAuth2Client.refreshAccessToken();
        const newAccessToken = credentials.access_token;

        // Set the new access token in an HTTP-only cookie
        res.cookie("access_token", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Set secure to true in production
            maxAge: 3600 * 1000 // 1 hour expiration
        });

        res.json({ message: "Access token refreshed successfully" });
    } catch (error) {
        console.error("❌ Error refreshing access token:", error);
        res.status(500).json({ error: "Failed to refresh access token" });
    }
});

// ✅ Server Setup
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`✅ Upload directory: ${path.join(process.cwd(), 'public/uploads/profile-pictures')}`);
});
