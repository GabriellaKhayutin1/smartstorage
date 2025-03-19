import express from 'express';
import Analytics from '../models/Analytics.js';
import authenticate from '../middleware/authMiddleware.js';

const router = express.Router();

// Get monthly analytics
router.get('/monthly', authenticate, async (req, res) => {
    try {
        const { month, year } = req.query;
        const currentDate = new Date();
        const targetMonth = month || currentDate.getMonth() + 1;
        const targetYear = year || currentDate.getFullYear();

        let analytics = await Analytics.findOne({
            userId: req.user.userId,
            month: targetMonth,
            year: targetYear
        });

        if (!analytics) {
            // If no analytics exist for this month, create a new one
            analytics = new Analytics({
                userId: req.user.userId,
                month: targetMonth,
                year: targetYear,
                tips: generateTips()
            });
            await analytics.save();
        }

        res.json(analytics);
    } catch (error) {
        console.error('Error fetching monthly analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Get historical analytics
router.get('/historical', authenticate, async (req, res) => {
    try {
        const analytics = await Analytics.find({
            userId: req.user.userId
        }).sort({ year: -1, month: -1 });

        res.json(analytics);
    } catch (error) {
        console.error('Error fetching historical analytics:', error);
        res.status(500).json({ error: 'Failed to fetch historical analytics' });
    }
});

// Helper function to generate personalized tips
function generateTips() {
    return [
        "Consider buying smaller portions of perishable items",
        "Use the 'first in, first out' method when organizing your fridge",
        "Plan your meals for the week before grocery shopping",
        "Store fruits and vegetables properly to extend their shelf life",
        "Consider freezing excess food before it expires",
        "Keep track of expiration dates in a visible place",
        "Use clear containers to better see what's in your fridge",
        "Consider donating excess food to local food banks"
    ];
}

export default router; 