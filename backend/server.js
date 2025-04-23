import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables with absolute path
dotenv.config({ path: path.join(__dirname, '.env') });

// Log environment variables for debugging
console.log('Environment variables loaded:', {
    STRIPE_SECRET_KEY_PREFIX: process.env.STRIPE_SECRET_KEY?.substring(0, 8),
    STRIPE_PREMIUM_PRICE_ID: process.env.STRIPE_PREMIUM_PRICE_ID?.substring(0, 8),
    NODE_ENV: process.env.NODE_ENV,
});

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import MongoStore from 'connect-mongo';
import { google } from "googleapis";
import jwt from "jsonwebtoken";
import stripe from "stripe";

import authRoutes from "./routes/authRoutes.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import profileRoutes from "./routes/profileRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import authenticate from "./middleware/authMiddleware.js";
import Ingredient from "./models/Ingredient.js";
import User from "./models/User.js";
import Analytics from "./models/Analytics.js";
import MonthlyCO2 from "./models/MonthlyCO2.js";
import { CO2_SAVINGS } from "./constants/co2Calculator.js";
import { createStripeCustomer } from './services/stripeService.js';
import paymentsRoutes from './routes/paymentsRoutes.js';

import checkSubscription from "./middleware/subscriptionMiddleware.js";
import { addEventToCalendar } from './services/calendarService.js';

const app = express();

// ✅ CORS Configuration
const allowedOrigins = [
    'http://localhost:5503',
    'http://127.0.0.1:5503',
    'http://localhost:5504',
    'http://127.0.0.1:5504',
    'http://localhost:5003',
    'http://127.0.0.1:5003',
    'https://smartstorage-k0v4.onrender.com'
];

// Configure CORS
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            console.log('❌ Origin not allowed by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'authToken']
}));

// Add security headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, authToken');
    
    // Add CSP headers for Stripe
    res.header(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://api.stripe.com https://*.stripe.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.stripe.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https://*.stripe.com; " +
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.stripe.com; " +
        "connect-src 'self' http://localhost:5503 http://localhost:5003 https://api.stripe.com https://merchant-ui-api.stripe.com https://r.stripe.com https://*.stripe.com; "
    );
    next();
});

// ✅ Middleware
app.use('/api/payments/webhook', express.raw({type: 'application/json'}));
app.use(express.json());
app.use(cookieParser());

// ✅ Serve static files from the public directory
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

// ✅ Session Middleware with MongoDB Store
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions', // Optional: customize the collection name
        ttl: 24 * 60 * 60, // Session TTL (in seconds) - 1 day
        autoRemove: 'native', // Enable automatic removal of expired sessions
        touchAfter: 24 * 3600 // Time period in seconds between session updates
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        maxAge: 24 * 60 * 60 * 1000, // Cookie expiry (in milliseconds) - 1 day
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use('/api/payments', paymentsRoutes);

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));



const redirectUri = process.env.NODE_ENV === 'production'
  ? "https://smartstorage-k0v4.onrender.com/oauthcallback"
  : "http://localhost:5003/oauthcallback";

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
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
        const name = userInfo.data.name || "Google User"; // Get name

        // Check if user exists in DB, create if not
        let user = await User.findOne({ email });

        if (!user) {
            console.log("👤 Creating new user with refresh token");

            // 1. Create Stripe Customer
            const stripeCustomer = await createStripeCustomer(email, name);
            if (!stripeCustomer) {
                throw new Error("Failed to create Stripe customer");
            }

            // 2. Create new User with trial & Stripe customer ID
            user = new User({
                googleId: userInfo.data.id,
                email,
                name, // Save name
                refreshToken: tokens.refresh_token,
                trialStart: new Date(),
                trialEnds: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                subscriptionStatus: "trial",
                stripeCustomerId: stripeCustomer.id, // Use Stripe ID
            });

            console.log("✅ Stripe customer created:", stripeCustomer.id);
        } else {
            console.log("👤 Updating existing user's refresh token");
            user.refreshToken = tokens.refresh_token;

            // Ensure existing user has a Stripe Customer ID
            if (!user.stripeCustomerId) {
                console.log(" Stripe Customer ID missing for existing user. Creating...");
                const stripeCustomer = await createStripeCustomer(user.email, user.name);
                if (!stripeCustomer) {
                    console.error("❌ Failed to create Stripe customer for existing user:", user.email);
                    // Decide how to handle this - maybe proceed without Stripe ID or throw error?
                    // For now, we log the error and proceed.
                } else {
                    user.stripeCustomerId = stripeCustomer.id;
                    console.log("✅ Stripe Customer ID created and added to existing user:", user.stripeCustomerId);
                     // Optionally, update Stripe customer metadata here if needed
                     const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY);
                    try {
                        await stripeClient.customers.update(stripeCustomer.id, {
                            metadata: { userId: user._id.toString() }
                        });
                        console.log(`✅ Updated Stripe customer ${stripeCustomer.id} metadata with userId: ${user._id.toString()}`);
                    } catch (stripeError) {
                        console.error(`❌ Failed to update Stripe customer metadata for ${stripeCustomer.id}:`, stripeError);
                    }
                }
            } else {
                 // Optionally, ensure metadata is up-to-date even if customer ID exists
                 const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY);
                 try {
                     const customer = await stripeClient.customers.retrieve(user.stripeCustomerId);
                     if (!customer.metadata || customer.metadata.userId !== user._id.toString()) {
                         await stripeClient.customers.update(user.stripeCustomerId, {
                             metadata: { userId: user._id.toString() }
                         });
                         console.log(`✅ Updated Stripe customer ${user.stripeCustomerId} metadata with userId: ${user._id.toString()}`);
                     }
                 } catch (stripeError) {
                     console.error(`❌ Failed to retrieve or update Stripe customer metadata for ${user.stripeCustomerId}:`, stripeError);
                 }
            }
        }


        await user.save();
        console.log("✅ User saved/updated:", {
            userId: user._id,
            email: user.email,
            hasRefreshToken: !!user.refreshToken,
            stripeCustomerId: user.stripeCustomerId
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
            maxAge: 3600 * 1000,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        });

        // Use FRONTEND_URL for redirect
        const finalFrontendRedirect = process.env.NODE_ENV === 'production'
            ? "https://smartstorage-k0v4.onrender.com/dashboard.html"
            : `${process.env.FRONTEND_URL}/dashboard.html`;

        console.log("🔄 Redirecting to Frontend URL:", finalFrontendRedirect);
        res.redirect(`${finalFrontendRedirect}?token=${jwtToken}`);

    } catch (error) {
        console.error("❌ OAuth Callback Error:", error);
        res.status(500).send(`Authentication failed: ${error.message}`);
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

app.get("/api/premium-stuff", authenticate, checkSubscription, async (req, res) => {
    // User is authenticated AND has an active trial or subscription
    res.json({ message: "🎉 Here's your premium content!" });
});

app.get("/api/debug/user", authenticate, async (req, res) => {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
        email: user.email,
        trialStart: user.trialStart,
        trialEnds: user.trialEnds,
        subscriptionStatus: user.subscriptionStatus,
        stripeCustomerId: user.stripeCustomerId, // Show Stripe ID
        stripeSubscriptionId: user.stripeSubscriptionId
    });
});

// ✅ Get Profile Info (used to show trial countdown on frontend)
app.get("/api/profile", authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            email: user.email,
            name: user.name,
            subscriptionStatus: user.subscriptionStatus,
            trialStart: user.trialStart,
            trialEnds: user.trialEnds,
            profilePicture: user.profilePicture,
        });
    } catch (error) {
        console.error("❌ Error fetching profile:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Route to get CO2 savings calculation
app.get("/api/co2-savings", authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const analytics = await Analytics.findOne({ userId });

        if (!analytics) {
            return res.json({ co2Savings: 0, treeEquivalent: 0 });
        }

        let totalCo2Savings = 0;

        // Calculate CO2 savings based on used ingredients
        analytics.usedIngredients.forEach(ingredient => {
            const co2Factor = CO2_SAVINGS[ingredient.name.toLowerCase()];
            if (co2Factor) {
                totalCo2Savings += (ingredient.weight / 1000) * co2Factor; // Convert weight to kg
            }
        });

        const treeEquivalent = totalCo2Savings / 21; // Approximate CO2 absorption per tree per year

        res.json({
            co2Savings: totalCo2Savings.toFixed(2),
            treeEquivalent: treeEquivalent.toFixed(2)
        });
    } catch (error) {
        console.error("❌ Error fetching CO2 savings:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Endpoint to manually trigger CO2 calculation for a user
app.post("/api/calculate-co2", authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const analytics = await Analytics.findOne({ userId });

        if (!analytics) {
            return res.status(404).json({ message: "No analytics data found for this user." });
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        let monthlyCo2Savings = 0;

        // Calculate CO2 savings for used ingredients within the current month
        analytics.usedIngredients.forEach(ingredient => {
            if (ingredient.usedDate >= startOfMonth && ingredient.usedDate <= endOfMonth) {
                const co2Factor = CO2_SAVINGS[ingredient.name.toLowerCase()];
                if (co2Factor) {
                    monthlyCo2Savings += (ingredient.weight / 1000) * co2Factor; // Convert weight to kg
                }
            }
        });

        // Find or create monthly CO2 record
        let monthlyRecord = await MonthlyCO2.findOne({
            userId,
            month: startOfMonth
        });

        if (!monthlyRecord) {
            monthlyRecord = new MonthlyCO2({
                userId,
                month: startOfMonth,
                co2Saved: monthlyCo2Savings
            });
        } else {
            monthlyRecord.co2Saved = monthlyCo2Savings; // Update if record exists
        }

        await monthlyRecord.save();

        res.json({
            message: "Monthly CO2 savings calculated successfully.",
            co2Saved: monthlyCo2Savings.toFixed(2)
        });
    } catch (error) {
        console.error("❌ Error calculating monthly CO2 savings:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ Add Ingredients Endpoint
app.post("/api/ingredients", authenticate, async (req, res) => {
    try {
        const { name, expiryDate, category } = req.body; // Removed quantity, weight, unit from destructuring if not needed elsewhere
        const userId = req.user.userId;
        const addedDate = new Date();

        console.log(`➕ Adding ingredient for user: ${userId}`, { name, expiryDate, category }); // Log relevant input

        // --- Calculate CO2 Saving Based ONLY on Category --- 
        let potentialCO2Saved = 0;
        const co2Factor = category ? (CO2_SAVINGS[category] || 0) : 0; // Get factor for category
        potentialCO2Saved = co2Factor; // Use the factor directly
        console.log(`CO2 Factor for category '${category}': ${co2Factor}`);
        console.log(`Calculated potential CO2 saving (Category Based): ${potentialCO2Saved.toFixed(2)} kg`);
        // --- End Calculation --- 

        const newIngredient = new Ingredient({
            userId,
            name,
            expiryDate,
            // Remove quantity, weight, unit if not needed for the model
            category,
            co2Saved: potentialCO2Saved, // Store category-based saving
        });

        await newIngredient.save();
        console.log("✅ Ingredient saved to Ingredient collection:", newIngredient._id);

        // --- Update Monthly CO2 for current month --- 
        if (potentialCO2Saved > 0) {
            const currentMonth = addedDate.getMonth() + 1;
            const currentYear = addedDate.getFullYear();
            console.log(`Attempting to update MonthlyCO2 for ${userId}, Month: ${currentMonth}, Year: ${currentYear}`);

            const updateResult = await MonthlyCO2.findOneAndUpdate(
                { userId: userId, month: currentMonth, year: currentYear },
                {
                    $inc: { co2Saved: potentialCO2Saved, itemsCount: 1 }, // Increment using category-based value
                    $push: { ingredients: { name: newIngredient.name, category: newIngredient.category, co2Saved: potentialCO2Saved } }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            console.log(`✅ MonthlyCO2 Update Result:`, updateResult ? `Doc ID: ${updateResult._id}, New CO2: ${updateResult.co2Saved.toFixed(2)}` : 'Update Failed or No Change');
        } else {
            console.log('Skipping MonthlyCO2 update because potentialCO2Saved is 0.');
        }
        // --- End Monthly CO2 Update --- 

        // Log event in analytics (using only relevant fields)
        await Analytics.findOneAndUpdate(
            { userId },
            { $push: { addedIngredients: { name, date: addedDate } } }, // Removed weight if not needed
            { upsert: true, new: true }
        );

        res.status(201).json(newIngredient);
    } catch (error) {
        console.error("❌ Error adding ingredient:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ Update Ingredient Endpoint
app.put("/api/ingredients/:id", authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const userId = req.user.userId;

        console.log(`🔄 Updating ingredient ${id} for user ${userId}`, updateData);

        const ingredient = await Ingredient.findOneAndUpdate(
            { _id: id, userId },
            updateData,
            { new: true }
        );

        if (!ingredient) {
            console.log("❌ Ingredient not found or user mismatch");
            return res.status(404).json({ error: "Ingredient not found" });
        }

        console.log("✅ Ingredient updated:", ingredient);
        res.json(ingredient);
    } catch (error) {
        console.error("❌ Error updating ingredient:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ Delete Ingredient Endpoint
app.delete("/api/ingredients/:id", authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const { used } = req.query; // Check if the item was used or discarded
        const usedDate = new Date(); // Record the date/time of deletion/use

        console.log(`🗑️ Deleting ingredient ${id} for user ${userId}. Used: ${used}`);

        const ingredient = await Ingredient.findOneAndDelete({ _id: id, userId });

        if (!ingredient) {
            console.log("❌ Ingredient not found or user mismatch");
            return res.status(404).json({ error: "Ingredient not found" });
        }

        // Log event in analytics
        const analyticsUpdate = used === 'true'
            ? { $push: { usedIngredients: { name: ingredient.name, date: usedDate, weight: ingredient.weight, usedDate: usedDate } } } // Ensure usedDate is logged
            : { $push: { discardedIngredients: { name: ingredient.name, date: usedDate, weight: ingredient.weight } } };

        await Analytics.findOneAndUpdate(
            { userId },
            analyticsUpdate,
            { upsert: true, new: true }
        );

        // --- Update Monthly CO2 if ingredient was used --- 
        if (used === 'true' && ingredient.weight) {
            const ingredientCO2Factor = CO2_SAVINGS[ingredient.category] || 0; // Use category for CO2 factor
            const ingredientCO2Saved = (ingredient.weight / 1000) * ingredientCO2Factor; // Calculate CO2 saved for this item
            
            if (ingredientCO2Saved > 0) {
                const usageMonth = usedDate.getMonth() + 1; // 1-12
                const usageYear = usedDate.getFullYear();

                await MonthlyCO2.findOneAndUpdate(
                    { userId: userId, month: usageMonth, year: usageYear },
                    {
                        $inc: { // Increment values
                            co2Saved: ingredientCO2Saved,
                            itemsCount: 1
                        },
                        $push: { // Add ingredient details
                            ingredients: {
                                name: ingredient.name,
                                category: ingredient.category,
                                co2Saved: ingredientCO2Saved
                            }
                        }
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true } // Create if not exists
                );
                console.log(`✅ Updated MonthlyCO2 for ${usageYear}-${usageMonth}: +${ingredientCO2Saved.toFixed(2)} kg`);
            }
        }
        // --- End Monthly CO2 Update --- 

        console.log("✅ Ingredient deleted:", id);
        res.json({ message: "Ingredient deleted successfully" });
    } catch (error) {
        console.error("❌ Error deleting ingredient:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Fetch ingredients near expiry
app.get("/api/ingredients/near-expiry", authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const today = new Date();
        const threeDaysFromNow = new Date(today);
        threeDaysFromNow.setDate(today.getDate() + 3);

        const nearExpiryIngredients = await Ingredient.find({
            userId: userId,
            expiryDate: { $gte: today, $lte: threeDaysFromNow }
        }).sort({ expiryDate: 1 }); // Sort by soonest expiry

        res.json(nearExpiryIngredients);
    } catch (error) {
        console.error("❌ Error fetching near-expiry ingredients:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Route to manually trigger calendar event creation for testing (Commented out as it depends on calendarService)
/*
app.post("/api/test-calendar-event", authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        // Example: Create an event for a fake ingredient expiring tomorrow
        const fakeIngredient = {
            name: "Test Item",
            expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expires tomorrow
        };

        const result = await addEventToCalendar(userId, fakeIngredient);
        res.json({ message: "Test event creation attempted", result });
    } catch (error) {
        console.error("❌ Error creating test calendar event:", error);
        res.status(500).json({ error: "Failed to create test event" });
    }
});
*/

// Serve index.html for any other routes (useful for SPA routing)
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

// --- Background Task: Check for expiring ingredients --- 
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // Check every 6 hours

async function checkAndNotifyExpiringIngredients() {
    console.log(`⏰ Running check for expiring ingredients... (${new Date().toISOString()})`);
    try {
        const today = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(today.getDate() + 3);

        // Find ingredients expiring within the next 3 days that don't have a calendarEventId yet
        const expiringIngredients = await Ingredient.find({
            expiryDate: { $gte: today, $lte: threeDaysFromNow },
            calendarEventId: { $exists: false } // Only find items without an event ID
        }).populate('userId', 'refreshToken'); // Populate user info needed for calendar event

        console.log(`⏰ Found ${expiringIngredients.length} ingredients expiring soon without notifications.`);

        for (const ingredient of expiringIngredients) {
            if (ingredient.userId && ingredient.userId.refreshToken) {
                const eventId = await addEventToCalendar(ingredient.userId._id, ingredient);
                if (eventId) {
                    // Save the event ID to the ingredient to prevent duplicates
                    ingredient.calendarEventId = eventId;
                    await ingredient.save();
                    console.log(`⏰ Updated ingredient ${ingredient._id} with calendarEventId: ${eventId}`);
                }
            } else {
                console.warn(`⏰ Skipping calendar notification for ingredient ${ingredient._id} due to missing user or refresh token.`);
            }
        }
        console.log(`⏰ Finished checking for expiring ingredients.`);

    } catch (error) {
        console.error('❌ Error during background check for expiring ingredients:', error);
    }
}

// Run the check once on startup (after a short delay to allow connection)
setTimeout(() => {
    checkAndNotifyExpiringIngredients(); 
    // Set interval to run periodically
    setInterval(checkAndNotifyExpiringIngredients, CHECK_INTERVAL_MS);
    console.log(`⏰ Background check for expiring ingredients scheduled every ${CHECK_INTERVAL_MS / (60 * 60 * 1000)} hours.`);
}, 30 * 1000); // Wait 30 seconds after start before first check
// --- End Background Task --- 

// ✅ Start Server
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  
