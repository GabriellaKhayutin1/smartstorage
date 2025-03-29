import express from "express";
import Ingredient from "../models/Ingredient.js"; 
import User from "../models/User.js"; 

const router = express.Router();

router.get("/", (req, res) => {
    res.json({ message: "Leaderboard API is working!" });
});

router.get('/waste-reduction', async (req, res) => {
  try {
    const leaderboard = await Ingredient.aggregate([
      {
        $group: {
          _id: "$userId",
          co2Saved: { $sum: "$co2Saved" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      {
        $unwind: "$userInfo"
      },
      {
        $project: {
          email: "$userInfo.email",
          name: {
            $ifNull: [
              "$userInfo.name",
              {
                $substrBytes: [
                  "$userInfo.email",
                  0,
                  { $indexOfBytes: ["$userInfo.email", "@"] }
                ]
              }
            ]
          },
          co2Saved: 1
        }
      },
      {
        $sort: { co2Saved: -1 }
      }
    ]);

    res.status(200).json(leaderboard);
  } catch (error) {
    console.error("❌ Error in leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard data" });
  }
});

export default router;
