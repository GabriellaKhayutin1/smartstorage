import jwt from "jsonwebtoken";

const authenticate = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized - No Token Provided" });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: "Invalid Token" });
        req.user = decoded;
        next();
    });
};

export default authenticate;
