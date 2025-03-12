import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// ✅ User Login Route
router.post("/login", async (req, res) => {
    try {
        const { email, password, googleId } = req.body;  // Capture the googleId from request

        // 🔹 Check if the user exists
        let user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        // If the user logs in with Google and doesn't have a Google ID, set it
        if (googleId && !user.googleId) {
            user.googleId = googleId;
            await user.save();  // Save the updated user
        }

        // If the user logs in with email and password, validate password
        if (password) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ error: "Invalid credentials" });
            }
        }

        // ✅ Generate JWT Token, including googleId if it exists
        const token = jwt.sign(
            { userId: user._id, email: user.email, googleId: user.googleId || null },  // Include googleId in the token
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        console.log("Generated Token:", token);  // Debugging: Check if token is created

        // ✅ Send token in response
        res.json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                email: user.email,
                googleId: user.googleId  // Include googleId in the response if it's available
            }
        });

    } catch (error) {
        console.error("❌ Login error:", error);
        res.status(500).json({ error: "Server error" });
    }
});


export default router;

// POST /api/auth/register - Register a new user
router.post("/register", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if both email and password are provided
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Check if the email is already registered
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the new user
        const user = new User({
            email,
            password: hashedPassword,  // Store hashed password
            refreshToken: "",          // Optional, can be populated if the user logs in via Google later
        });

        // Save the user
        await user.save();

        // Generate a JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        // Send response back with the token
        res.json({
            message: "Registration successful",
            token,  // JWT token for user authentication
            user: {
                id: user._id,
                email: user.email,
            }
        });
    } catch (error) {
        console.error("❌ Registration error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
