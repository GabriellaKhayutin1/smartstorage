import express from "express";
import Ingredient from "../models/Ingredient.js"; 
import User from "../models/User.js"; 
import { CO2_SAVINGS } from "../../js/co2Calculator.js";

const router = express.Router();


// Helper function to extract name from email
function extractName(email) {
    if (!email) return 'Anonymous User';
    const parts = email.split('@');
    return parts[0] || 'Anonymous User';
}

// ✅ Default route to check if leaderboard API is working
router.get("/", (req, res) => {
    res.json({ message: "Leaderboard API is working!" });
});

// 📌 Get Leaderboard (Least Expired Items)
router.get("/waste-reduction", async (req, res) => {
    try {
        const today = new Date().toISOString(); 

        const users = await User.find();
        let leaderboard = [];

        for (const user of users) {
            const userId = user._id;

            const expiredCount = await Ingredient.countDocuments({
                userId,
                expiryDate: { $lt: today }, 
            });

            const ingredients = await Ingredient.find({ userId });
            let co2Saved = 0;
            ingredients.forEach(item => {
                co2Saved += CO2_SAVINGS[item.category] || 0; 
            });

            leaderboard.push({
                userId: user._id,
                email: user.email,
                name: user.name || extractName(user.email),
                expiredItems: expiredCount,
                co2Saved,
            });
        }

        leaderboard.sort((a, b) => {
            if (a.expiredItems === b.expiredItems) {
                return b.co2Saved - a.co2Saved; 
            }
            return a.expiredItems - b.expiredItems;
        });

        res.json(leaderboard);
    } catch (error) {
        console.error("❌ Error fetching leaderboard:", error);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
