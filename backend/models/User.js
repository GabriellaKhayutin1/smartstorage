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
    
    // Stripe fields
    stripeCustomerId: { type: String, unique: true, sparse: true },
    stripeSubscriptionId: { type: String },
    
    // Trial and subscription fields
    trialStart: { type: Date },
    trialEnds: { type: Date },
    subscriptionStart: { type: Date },
    currentPeriodEnd: { type: Date },
    subscriptionStatus: {
        type: String,
        enum: ["trial", "active", "inactive", "pending", "past_due", "cancelled"],
        default: "trial"
    }
}, { timestamps: true });

// Add method to check if user has active subscription
UserSchema.methods.hasActiveSubscription = function() {
    const now = new Date();
    return (
        // Check if subscription is active
        this.subscriptionStatus === 'active' &&
        // Check if current period hasn't ended
        (!this.currentPeriodEnd || this.currentPeriodEnd > now)
    ) || (
        // Or check if trial is still valid
        this.subscriptionStatus === 'trial' &&
        this.trialEnds > now
    );
};

export default mongoose.model("User", UserSchema);
