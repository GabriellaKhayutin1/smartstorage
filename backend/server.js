const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// ✅ Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/pantry", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// ✅ Define Schema & Model
const ingredientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    expiryDate: { type: Date, required: true }
});

const Ingredient = mongoose.model("Ingredient", ingredientSchema);

// ✅ API Routes

// 🔹 Get all ingredients
app.get("/ingredients", async (req, res) => {
    const ingredients = await Ingredient.find();
    res.json(ingredients);
});

// 🔹 Add an ingredient
app.post("/ingredients", async (req, res) => {
    try {
        console.log("📌 Received Data:", req.body); // Debugging

        const { name, category, expiryDate } = req.body;

        if (!name || !category || !expiryDate) {
            return res.status(400).json({ error: "Missing data" });
        }

        const newIngredient = new Ingredient({
            name,
            category,
            expiryDate: new Date(expiryDate) // ✅ Convert expiryDate to Date format
        });

        await newIngredient.save();
        console.log("✅ Saved Ingredient:", newIngredient); // Debugging
        res.json(newIngredient);
    } catch (error) {
        console.error("❌ Error saving ingredient:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ Update an ingredient
app.put("/ingredients/:id", async (req, res) => {
    try {
        const { name, category, expiryDate } = req.body;

        if (!name || !category || !expiryDate) {
            return res.status(400).json({ error: "Missing data" });
        }

        const updatedIngredient = await Ingredient.findByIdAndUpdate(
            req.params.id,
            {
                name,
                category,
                expiryDate: new Date(expiryDate) // ✅ Ensure expiryDate is saved correctly
            },
            { new: true } // ✅ Return updated ingredient
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
app.delete("/ingredients/:id", async (req, res) => {
    await Ingredient.findByIdAndDelete(req.params.id);
    res.json({ message: "Ingredient deleted" });
});

// ✅ Start the Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
