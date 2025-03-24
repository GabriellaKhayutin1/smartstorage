import express from 'express';
import Achievement from '../models/Achievement.js';
import Ingredient from '../models/Ingredient.js';
import { CO2_SAVINGS } from '../constants/co2Calculator.js';
import { checkAndAwardAchievements } from '../utils/achievements.js';
import authenticate from '../middleware/authMiddleware.js';

const router = express.Router();

// Get user achievements
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Get total CO2 saved from all ingredients
        const ingredients = await Ingredient.find({ userId });
        let totalCO2Saved = 0;
        ingredients.forEach(item => {
            totalCO2Saved += CO2_SAVINGS[item.category] || 0;
        });

        console.log(`Total CO2 saved for user ${userId}: ${totalCO2Saved}kg`);

        // Find or create user's achievement document
        let userAchievements = await Achievement.findOne({ userId });
        
        if (!userAchievements) {
            userAchievements = new Achievement({
                userId,
                achievements: []
            });
            await userAchievements.save();
        }

        // Check and update achievements
        const achievements = await checkAndAwardAchievements(userId, totalCO2Saved);
        
        res.json({ achievements: achievements.achievements });
    } catch (error) {
        console.error('Error fetching achievements:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
});

export default router; 