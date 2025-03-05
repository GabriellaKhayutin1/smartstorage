import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// ✅ User Login Route
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // 🔹 Check if the user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        // 🔹 Validate Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        // ✅ Generate JWT Token (Make sure `userId` is stored)
        const token = jwt.sign(
            { userId: user._id, email: user.email }, // 🔹 Change `id` to `userId`
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        console.log("Generated Token:", token);  // 🔹 Debugging: Check if token is created

        // ✅ Send token in response
        res.json({
            message: "Login successful",
            token,  // 🔹 Ensure token is included
            user: {
                id: user._id,
                email: user.email
            }
        });

    } catch (error) {
        console.error("❌ Login error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
