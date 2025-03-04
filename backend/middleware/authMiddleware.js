import jwt from "jsonwebtoken";

const authenticate = (req, res, next) => {
    const token = req.cookies.token || req.header("Authorization")?.split(" ")[1];

    if (!token) {
        console.log("❌ No token provided");
        return res.status(401).json({ error: "Unauthorized - No Token Provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("🔑 Decoded Token Data:", decoded); // Debugging line
        req.user = decoded; // ✅ Attach user ID to req.user
        next();
    } catch (error) {
        console.log("❌ Invalid Token:", error.message);
        return res.status(401).json({ error: "Unauthorized - Invalid Token" });
    }
};

export default authenticate;
