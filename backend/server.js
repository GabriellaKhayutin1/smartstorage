import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import authenticate from "./middleware/authMiddleware.js";
import Ingredient from "./models/Ingredient.js";
import { google } from "googleapis";
import path from "path";
import session from "express-session";
import User from "./models/User.js";
import jwt from "jsonwebtoken";

dotenv.config(); // Load environment variables
const app = express();

// Add session middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Enable CORS
app.use(cors({
    origin: "http://127.0.0.1:5501",
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Connect to MongoDB
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const TOKEN_PATH = path.join(process.cwd(), "token.json");

// OAuth2 Client Setup
const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:5003/oauthcallback"
);

// Authentication Routes
app.use("/api/auth", authRoutes);

// Google OAuth flow for login
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


app.post("/api/ingredients", authenticate, async (req, res) => {
    try {
        // Log received data and user info
        console.log("📌 Received Data from Client:", req.body);
        console.log("🔑 User from Token:", req.user);
        console.log("🔑 Extracted User ID:", req.user?.userId || "❌ No user ID found");

        const { name, category, expiryDate } = req.body;
        const userId = req.user?.userId; // Extract user ID from token

        if (!userId) {
            console.log("❌ Error: User ID is missing from token!");
            return res.status(400).json({ error: "User ID is missing from token" });
        }

        // Ensure all required data is provided
        if (!name || !category || !expiryDate) {
            console.log("❌ Error: Missing required data");
            return res.status(400).json({ error: "Missing name, category, or expiry date" });
        }

        // ✅ Create and save the ingredient
        const newIngredient = new Ingredient({
            userId,
            name,
            category,
            expiryDate: new Date(expiryDate), // Convert expiry date to proper format
        });

        await newIngredient.save();
        console.log("✅ Saved Ingredient:", newIngredient);

        // ✅ Optionally, add an expiry event to Google Calendar (for Google users)
        await addCalendarEvent(newIngredient, userId)
            .then(event => {
                console.log(`✅ Google Calendar event created for user ${userId}: ${event?.htmlLink || "No link available"}`);
            })
            .catch(error => {
                console.error("❌ Error creating Google Calendar event:", error);
            });

        // Respond with the created ingredient data
        res.status(201).json(newIngredient);
    } catch (error) {
        console.error("❌ Error saving ingredient:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// Function to add an event to Google Calendar
async function addCalendarEvent(ingredient, userId) {
    try {
        // Find the user by userId to get their refresh token
        const user = await User.findById(userId);
        if (!user || !user.refreshToken) {
            console.log("❌ No Google credentials found for user.");
            return null;
        }

        // Use the user's refresh token to get an access token
        oAuth2Client.setCredentials({ refresh_token: user.refreshToken });

        // Calculate the start date (2 days before the expiry date)
        const startTime = new Date(ingredient.expiryDate);
        startTime.setDate(startTime.getDate() - 2); // Subtract 2 days for the event start time

        // Create the calendar event details
        const event = {
            summary: `Ingredient: ${ingredient.name}`,
            description: `Category: ${ingredient.category}`,
            start: {
                dateTime: startTime, // Set the start time of the event to 2 days before the expiry date
                timeZone: 'UTC'
            },
            end: {
                dateTime: new Date(startTime.getTime() + 30 * 60 * 1000), // Add 30 minutes to the reminder time for event duration
                timeZone: 'UTC'
            },
            reminders: {
                useDefault: false,
                overrides: [
                    {
                        method: 'popup', // Method for reminder (popup or email)
                        minutes: 48 * 60 // Set reminder 48 hours (2 days) before the event
                    }
                ]
            }
        };

        // Use the Google Calendar API to create the event
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event
        });

        console.log(`✅ Google Calendar event created: ${response.data.htmlLink}`);
        return response.data;  // Return event details
    } catch (error) {
        console.error("❌ Error creating Google Calendar event:", error);
        throw error;  // Throw error to handle it in the calling route
    }
}

// DELETE /api/ingredients/:id - Delete an ingredient by ID
app.delete("/api/ingredients/:id", authenticate, async (req, res) => {
    try {
        const ingredientId = req.params.id;
        const userId = req.user?.userId;

        if (!ingredientId) {
            return res.status(400).json({ error: "Ingredient ID is required" });
        }

        // Find and delete the ingredient
        const ingredient = await Ingredient.findOneAndDelete({ _id: ingredientId, userId: userId });

        if (!ingredient) {
            return res.status(404).json({ error: "Ingredient not found or user not authorized" });
        }

        // Successfully deleted the ingredient
        console.log(`✅ Deleted Ingredient with ID: ${ingredientId}`);
        res.status(200).json({ message: "Ingredient deleted successfully", ingredient });
    } catch (error) {
        console.error("❌ Error deleting ingredient:", error);
        res.status(500).json({ error: "Failed to delete ingredient" });
    }
});

// PUT /api/ingredients/:id - Update an ingredient by ID
app.put("/api/ingredients/:id", authenticate, async (req, res) => {
    try {
        const ingredientId = req.params.id;  // Get the ingredient ID from the URL
        const { name, category, expiryDate } = req.body;  // Get the new ingredient details
        const userId = req.user?.userId;  // Get the user ID from the authenticated token

        if (!ingredientId) {
            return res.status(400).json({ error: "Ingredient ID is required" });
        }

        if (!name || !category || !expiryDate) {
            return res.status(400).json({ error: "Name, category, and expiry date are required" });
        }

        // Find the ingredient by ID and check if it belongs to the user
        const ingredient = await Ingredient.findOne({ _id: ingredientId, userId: userId });

        if (!ingredient) {
            return res.status(404).json({ error: "Ingredient not found or user not authorized" });
        }

        // Update the ingredient with the new data
        ingredient.name = name;
        ingredient.category = category;
        ingredient.expiryDate = new Date(expiryDate);  // Ensure expiry date is in the correct format

        await ingredient.save();  // Save the updated ingredient

        // Optionally, update the Google Calendar event if necessary
        // You can call a function to update the Google Calendar event related to this ingredient here if needed

        console.log(`✅ Updated Ingredient with ID: ${ingredientId}`);
        res.status(200).json(ingredient);  // Respond with the updated ingredient
    } catch (error) {
        console.error("❌ Error updating ingredient:", error);
        res.status(500).json({ error: "Failed to update ingredient" });
    }
});


// OAuth callback to receive tokens after successful authentication
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
            maxAge: 3600 * 1000 // Token expiration time (1 hour in this case)
        });
        

        res.redirect(`http://127.0.0.1:5501/index.html?token=${jwtToken}`);
    } catch (error) {
        console.error("❌ OAuth Callback Error:", error);
        res.status(500).send("Authentication failed.");
    }
});

// Fetch ingredients using authenticated user
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

// Refresh the access token using the refresh token stored in MongoDB
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

// Server setup
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
