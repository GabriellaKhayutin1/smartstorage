import express from "express";
import multer from "multer";
import path from "path";
import User from "../models/User.js";
import authenticate from "../middleware/authMiddleware.js";
import Ingredient from "../models/Ingredient.js";
import MonthlyCO2 from "../models/MonthlyCO2.js";

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profile-pictures');
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
        }
    }
});

// Upload profile picture
router.post('/upload-picture', authenticate, upload.single('profilePicture'), async (req, res) => {
    try {
        console.log('Upload request received:', req.file);
        
        if (!req.file) {
            console.error('No file uploaded');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const userId = req.user.userId;
        const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;

        console.log('Updating user profile picture:', {
            userId,
            profilePictureUrl
        });

        // Update user's profile picture
        const user = await User.findByIdAndUpdate(
            userId,
            { profilePicture: profilePictureUrl },
            { new: true }
        );

        if (!user) {
            console.error('User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }

        console.log('Profile picture updated successfully');
        res.json({
            message: 'Profile picture updated successfully',
            profilePicture: profilePictureUrl
        });
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        if (error.message === 'Invalid file type. Only JPEG, PNG and GIF are allowed.') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error uploading profile picture' });
    }
});

// Get user profile
router.get('/', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password -refreshToken');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Error fetching user profile' });
    }
});

// ✅ Fetch Ingredients for Authenticated User
router.get("/ingredients", authenticate, async (req, res) => {
    try {
        console.log("🔎 Fetching ingredients for user:", req.user.userId);
        const ingredients = await Ingredient.find({ userId: req.user.userId });
        res.json(ingredients);
    } catch (error) {
        console.error("❌ Error fetching ingredients:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ Get monthly CO2 analytics
router.get('/co2-savings/monthly', authenticate, async (req, res) => {
    try {
        const { year: queryYear } = req.query;
        const currentYear = new Date().getFullYear();
        const targetYear = queryYear ? parseInt(queryYear) : currentYear;
        console.log(`📊 [CO2 Route] Fetching monthly data for user: ${req.user.userId}, year: ${targetYear}`); // Log year

        const monthlyData = await MonthlyCO2.find({
            userId: req.user.userId,
            year: targetYear
        }).sort({ month: 1 }); // Sort by month

        console.log(`📊 [CO2 Route] Found data:`, JSON.stringify(monthlyData, null, 2)); // Log data found

        res.json(monthlyData);
    } catch (error) {
        console.error('Error fetching monthly CO2 data:', error);
        res.status(500).json({ error: 'Failed to fetch monthly CO2 data' });
    }
});

export default router; 