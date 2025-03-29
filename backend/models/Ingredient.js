import mongoose from "mongoose";

const IngredientSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    expiryDate: { type: Date, required: true },
    estimatedCost: {
        type: Number,
        default: 0
    },
    co2Saved: { // ✅ Add this field
        type: Number,
        default: 0
    },
    calendarEventId: {
        type: String
    }
}, {
    timestamps: true
});

export default mongoose.model("Ingredient", IngredientSchema);
