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
import analyticsRoutes from "./routes/analyticsRoutes.js";
import authenticate from "./middleware/authMiddleware.js";
import Ingredient from "./models/Ingredient.js";
import User from "./models/User.js";
import Analytics from "./models/Analytics.js";

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
app.use("/api/analytics", analyticsRoutes);

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
            console.log("👤 Creating new user with refresh token");
            user = new User({
                googleId: userInfo.data.id,
                email,
                refreshToken: tokens.refresh_token
            });
        } else {
            console.log("👤 Updating existing user's refresh token");
            user.refreshToken = tokens.refresh_token;
        }
        
        await user.save();
        console.log("✅ User saved with refresh token:", {
            userId: user._id,
            email: user.email,
            hasRefreshToken: !!user.refreshToken
        });

        // Generate a JWT for the user
        const jwtToken = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        // Set the access token in an HTTP-only cookie
        res.cookie("access_token", tokens.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600 * 1000
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

// ✅ Add New Ingredient
app.post("/api/ingredients", authenticate, async (req, res) => {
    try {
        const { name, category, expiryDate } = req.body;
        
        // Validate required fields
        if (!name || !category || !expiryDate) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Create new ingredient
        const ingredient = new Ingredient({
            userId: req.user.userId,
            name,
            category,
            expiryDate: new Date(expiryDate)
        });

        // Save to database
        await ingredient.save();
        console.log("✅ New ingredient added:", ingredient);

        // Get user to access refresh token
        const user = await User.findById(req.user.userId);
        console.log("🔍 Found user:", {
            id: user._id,
            email: user.email,
            hasRefreshToken: !!user.refreshToken
        });

        if (user && user.refreshToken) {
            try {
                console.log("🔄 Starting calendar event creation process...");
                
                // Set up OAuth2 client with user's refresh token
                oAuth2Client.setCredentials({ refresh_token: user.refreshToken });
                
                // Create calendar event
                const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
                
                // Calculate reminder date (2 days before expiry)
                const reminderDate = new Date(ingredient.expiryDate);
                reminderDate.setDate(reminderDate.getDate() - 2);
                
                // Format dates for display
                const formattedExpiryDate = ingredient.expiryDate.toLocaleDateString();
                const formattedReminderDate = reminderDate.toLocaleDateString();
                
                console.log('📅 Event details:', {
                    ingredient: ingredient.name,
                    expiryDate: formattedExpiryDate,
                    reminderDate: formattedReminderDate
                });
                
                const event = {
                    summary: `⚠️ ${ingredient.name} is expiring soon!`,
                    description: `Your ${ingredient.name} (${ingredient.category}) will expire on ${formattedExpiryDate}.\n\nReminder set for: ${formattedReminderDate}`,
                    start: {
                        dateTime: reminderDate.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    },
                    end: {
                        dateTime: new Date(reminderDate.getTime() + 60 * 60 * 1000).toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    },
                    reminders: {
                        useDefault: false,
                        overrides: [
                            { method: 'email', minutes: 24 * 60 },
                            { method: 'popup', minutes: 60 },
                        ],
                    },
                };

                console.log('📝 Creating calendar event with details:', {
                    summary: event.summary,
                    start: event.start.dateTime,
                    end: event.end.dateTime,
                    timeZone: event.start.timeZone
                });

                const response = await calendar.events.insert({
                    calendarId: 'primary',
                    resource: event,
                    sendUpdates: 'all'
                });
                
                console.log('✅ Calendar event created successfully:', response.data.htmlLink);
                
                // Store the calendar event ID in the ingredient
                ingredient.calendarEventId = response.data.id;
                await ingredient.save();
                console.log('✅ Calendar event ID saved to ingredient');
            } catch (calendarError) {
                console.error('❌ Failed to create calendar event:', calendarError.message);
                if (calendarError.response) {
                    console.error('Error details:', calendarError.response.data);
                }
                // Don't fail the whole request if calendar event creation fails
            }
        } else {
            console.log('⚠️ No refresh token found for user, skipping calendar event creation');
        }

        res.status(201).json(ingredient);
    } catch (error) {
        console.error("❌ Error adding ingredient:", error);
        res.status(500).json({ error: "Failed to add ingredient" });
    }
});

// ✅ Update Ingredient
app.put("/api/ingredients/:id", authenticate, async (req, res) => {
    try {
        const { name, category, expiryDate } = req.body;
        
        // Validate required fields
        if (!name || !category || !expiryDate) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Find and update ingredient
        const ingredient = await Ingredient.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.userId },
            { name, category, expiryDate: new Date(expiryDate) },
            { new: true }
        );

        if (!ingredient) {
            return res.status(404).json({ error: "Ingredient not found" });
        }

        console.log("✅ Ingredient updated:", ingredient);
        res.json(ingredient);
    } catch (error) {
        console.error("❌ Error updating ingredient:", error);
        res.status(500).json({ error: "Failed to update ingredient" });
    }
});

// ✅ Delete Ingredient
app.delete("/api/ingredients/:id", authenticate, async (req, res) => {
    try {
        const ingredient = await Ingredient.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.userId
        });

        if (!ingredient) {
            return res.status(404).json({ error: "Ingredient not found" });
        }

        // Track waste in analytics
        const currentDate = new Date();
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();

        // Find or create analytics for current month
        let analytics = await Analytics.findOne({
            userId: req.user.userId,
            month,
            year
        });

        if (!analytics) {
            analytics = new Analytics({
                userId: req.user.userId,
                month,
                year
            });
        }

        // Update analytics with wasted food
        analytics.totalFoodWasted += 1;
        analytics.totalMoneyWasted += ingredient.estimatedCost || 0;

        // Add to wasted foods list
        analytics.wastedFoods.push({
            name: ingredient.name,
            category: ingredient.category,
            amount: 1,
            estimatedCost: ingredient.estimatedCost || 0
        });

        await analytics.save();

        console.log("✅ Ingredient deleted and waste tracked:", ingredient);
        res.json({ message: "Ingredient deleted successfully" });
    } catch (error) {
        console.error("❌ Error deleting ingredient:", error);
        res.status(500).json({ error: "Failed to delete ingredient" });
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
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600 * 1000
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
