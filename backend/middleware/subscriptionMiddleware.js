import User from "../models/User.js";

const checkSubscription = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        const trialExpired = new Date() > user.trialEnds;
        const notSubscribed = user.subscriptionStatus !== 'active';

        if (trialExpired && notSubscribed) {
            return res.status(403).json({
                error: "Your free trial has ended. Please subscribe to continue."
            });
        }

        next();
    } catch (error) {
        console.error("❌ Subscription check failed:", error);
        res.status(500).json({ error: "Subscription check failed" });
    }
};

export default checkSubscription;
