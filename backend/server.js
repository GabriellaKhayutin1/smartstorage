import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js"; // ✅ Authentication routes

dotenv.config(); // Load .env variables

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
    process.exit(1); // Stop the server if the database is missing
}

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("✅ Connected to MongoDB Atlas!"))
.catch(err => console.error("❌ MongoDB Connection Error:", err));

// ✅ Define Schema & Model (Ingredients)
const ingredientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    expiryDate: { type: Date, required: true }
});

const Ingredient = mongoose.model("Ingredient", ingredientSchema);

// ✅ API Routes
app.use("/api/auth", authRoutes); // 🔹 Authentication Routes

// 🔹 Get all ingredients
app.get("/api/ingredients", async (req, res) => {
    const ingredients = await Ingredient.find();
    res.json(ingredients);
});

// 🔹 Add an ingredient
app.post("/api/ingredients", async (req, res) => {
    try {
        console.log("📌 Received Data:", req.body);

        const { name, category, expiryDate } = req.body;

        if (!name || !category || !expiryDate) {
            return res.status(400).json({ error: "Missing data" });
        }

        const newIngredient = new Ingredient({
            name,
            category,
            expiryDate: new Date(expiryDate)
        });

        await newIngredient.save();
        console.log("✅ Saved Ingredient:", newIngredient);
        res.json(newIngredient);
    } catch (error) {
        console.error("❌ Error saving ingredient:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// 🔹 Update an ingredient
app.put("/api/ingredients/:id", async (req, res) => {
    try {
        const { name, category, expiryDate } = req.body;

        if (!name || !category || !expiryDate) {
            return res.status(400).json({ error: "Missing data" });
        }

        const updatedIngredient = await Ingredient.findByIdAndUpdate(
            req.params.id,
            { name, category, expiryDate: new Date(expiryDate) },
            { new: true }
        );

        if (!updatedIngredient) {
            return res.status(404).json({ error: "Ingredient not found" });
        }

        res.json(updatedIngredient);
    } catch (error) {
        console.error("❌ Error updating ingredient:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// 🔹 Delete an ingredient
app.delete("/api/ingredients/:id", async (req, res) => {
    await Ingredient.findByIdAndDelete(req.params.id);
    res.json({ message: "Ingredient deleted" });
});

// ✅ Start the Server
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
