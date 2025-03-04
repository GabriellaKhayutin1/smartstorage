import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import authenticate from "./middleware/authMiddleware.js"; // ✅ Import authentication middleware
import Ingredient from "./models/Ingredient.js";

dotenv.config(); // Load environment variables

const app = express();

// ✅ Enable CORS for frontend requests
app.use(cors({
    origin: "http://127.0.0.1:5501",
    credentials: true
}));

// ✅ Middleware
app.use(express.json());
app.use(cookieParser());

// ✅ Connect to MongoDB Atlas
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
    console.error("❌ MONGO_URI is not defined in .env");
    process.exit(1); // Stop the server if the database connection fails
}

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("✅ Connected to MongoDB Atlas!"))
.catch(err => console.error("❌ MongoDB Connection Error:", err));

// ✅ API Routes
app.use("/api/auth", authRoutes); // 🔹 Authentication Routes

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


app.post("/api/ingredients", authenticate, async (req, res) => {
    try {
        console.log("📌 Received Data from Client:", req.body);
        console.log("🔑 User from Token:", req.user); // Log full user object
        console.log("🔑 Extracted User ID:", req.user?.userId || "❌ No user ID found"); // Fix here

        const { name, category, expiryDate } = req.body;
        const userId = req.user?.userId; // ✅ Fix: Use `userId` instead of `id`

        if (!userId) {
            console.log("❌ Error: User ID is missing from token!");
            return res.status(400).json({ error: "User ID is missing from token" });
        }

        if (!name || !category || !expiryDate) {
            console.log("❌ Error: Missing required data");
            return res.status(400).json({ error: "Missing data" });
        }

        const newIngredient = new Ingredient({
            userId,  // ✅ Ensure userId is stored
            name,
            category,
            expiryDate: new Date(expiryDate)
        });

        await newIngredient.save();
        console.log("✅ Saved Ingredient:", newIngredient);
        res.status(201).json(newIngredient);
    } catch (error) {
        console.error("❌ Error saving ingredient:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});




// 🔹 Update an ingredient (Requires authentication)
app.put("/api/ingredients/:id", authenticate, async (req, res) => {
    try {
        const { name, category, expiryDate } = req.body;

        if (!name || !category || !expiryDate) {
            return res.status(400).json({ error: "Missing data" });
        }

        const updatedIngredient = await Ingredient.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id }, // ✅ Ensure user can only update their own ingredients
            { name, category, expiryDate: new Date(expiryDate) },
            { new: true }
        );

        if (!updatedIngredient) {
            return res.status(404).json({ error: "Ingredient not found or unauthorized" });
        }

        res.json(updatedIngredient);
    } catch (error) {
        console.error("❌ Error updating ingredient:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// 🔹 Delete an ingredient (only if it belongs to the user)
app.delete("/api/ingredients/:id", authenticate, async (req, res) => {
    try {
        const ingredient = await Ingredient.findOne({ _id: req.params.id, userId: req.user.userId });

        if (!ingredient) {
            return res.status(404).json({ error: "Ingredient not found or unauthorized" });
        }

        await Ingredient.findByIdAndDelete(req.params.id);
        res.json({ message: "Ingredient deleted" });
    } catch (error) {
        console.error("❌ Error deleting ingredient:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// ✅ Start the Server
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
