import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    name: { type: String }, // Add name field for Google accounts
    googleId: { type: String, unique: true, sparse: true }, // Optional Google ID
    refreshToken: { type: String }, // Store refresh token securely
    password: { type: String }, // Optional password field
    profilePicture: { type: String }, // URL to the profile picture
}, { timestamps: true });

export default mongoose.model("User", UserSchema);
