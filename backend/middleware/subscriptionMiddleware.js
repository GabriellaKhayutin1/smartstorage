import User from "../models/User.js";

const checkSubscription = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        if (!user.hasActiveSubscription()) {
            return res.status(403).json({
                error: "Your subscription has expired. Please subscribe to continue.",
                subscriptionStatus: user.subscriptionStatus,
                trialEnds: user.trialEnds,
                currentPeriodEnd: user.currentPeriodEnd
            });
        }

        req.subscription = {
            status: user.subscriptionStatus,
            trialEnds: user.trialEnds,
            currentPeriodEnd: user.currentPeriodEnd
        };

        next();
    } catch (error) {
        console.error("❌ Subscription check failed:", error);
        res.status(500).json({ error: "Subscription check failed" });
    }
};

export default checkSubscription;
