import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    googleId: { type: String, unique: true, sparse: true }, // Optional Google ID
    refreshToken: { type: String }, // Store refresh token securely
    password: { type: String }, // Optional password field
}, { timestamps: true });

export default mongoose.model("User", UserSchema);
