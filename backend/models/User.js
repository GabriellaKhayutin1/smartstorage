import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    name: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    refreshToken: { type: String },
    password: {
        type: String,
        required: function () {
            return !this.googleId;
        }
    },
    profilePicture: { type: String },
    mollieCustomerId: { type: String, unique: true, sparse: true },
    mandateId: { type: String }, // optional but helpful


    // ✅ Trial and subscription fields
    trialStart: { type: Date },
    trialEnds: { type: Date },
    subscriptionStatus: {
        type: String,
        enum: ["trial", "active", "inactive"],
        default: "trial"
    }
}, { timestamps: true });


export default mongoose.model("User", UserSchema);
