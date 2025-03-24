const express = require('express');
const router = express.Router();
const Ingredient = require('../models/Ingredient');
const User = require('../models/User');

router.get('/waste-reduction', async (req, res) => {
  try {
    const leaderboard = await Ingredient.aggregate([
      {
        $group: {
          _id: "$userId", // group by userId (ObjectId)
          co2Saved: { $sum: "$co2Saved" }
        }
      },
      {
        $lookup: {
          from: "users",              // collection name in MongoDB
          localField: "_id",          // from Ingredient
          foreignField: "_id",        // in User collection
          as: "userInfo"
        }
      },
      {
        $unwind: "$userInfo"         // flatten userInfo array
      },
      {
        $project: {
          email: "$userInfo.email",
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

module.exports = router;

document.addEventListener("DOMContentLoaded", async () => {
    const leaderboardBody = document.getElementById("leaderboard-body");

    // Podium elements
    const firstName = document.getElementById("first-place-name");
    const secondName = document.getElementById("second-place-name");
    const thirdName = document.getElementById("third-place-name");

    const firstCO2 = document.getElementById("first-place-co2");
    const secondCO2 = document.getElementById("second-place-co2");
    const thirdCO2 = document.getElementById("third-place-co2");

    try {
        const response = await fetch("http://localhost:5003/api/leaderboard/waste-reduction", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) throw new Error("API request failed");

        const leaderboard = await response.json();
        if (!leaderboard.length) throw new Error("No data received");

        // Handle Podium
        const [first, second, third, ...rest] = leaderboard;

        if (first) {
            firstName.textContent = first.name;
            firstCO2.textContent = `${first.co2Saved.toFixed(2)} kg`;
        }
        if (second) {
            secondName.textContent = second.name;
            secondCO2.textContent = `${second.co2Saved.toFixed(2)} kg`;
        }
        if (third) {
            thirdName.textContent = third.name;
            thirdCO2.textContent = `${third.co2Saved.toFixed(2)} kg`;
        }

        // Clear table
        leaderboardBody.innerHTML = "";

        // Loop through entire list and build the table
        leaderboard.forEach((user, index) => {
            const row = document.createElement("tr");
            row.classList.add("transition-all", "duration-300", "ease-in-out", "hover:bg-green-50", "hover:scale-[1.01]");

            // Ranking color styles
            if (index === 0) {
                row.classList.add("bg-[#b4e197]", "text-green-900", "font-semibold", "shadow-lg");
            } else if (index === 1) {
                row.classList.add("bg-[#d3e9c9]", "text-gray-800", "font-semibold", "shadow");
            } else if (index === 2) {
                row.classList.add("bg-[#ead4b3]", "text-gray-900", "font-semibold", "shadow-sm");
            } else {
                row.classList.add("bg-white", "text-gray-700");
            }

            rrow.innerHTML = `
            <td class="p-3 text-center">${index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}</td>
            <td class="p-3">${user.name}</td>
            <td class="p-3">${user.co2Saved.toFixed(2)} kg</td>
        `;
        

            leaderboardBody.appendChild(row);
        });

    } catch (error) {
        console.error("❌ Error loading leaderboard:", error);
        leaderboardBody.innerHTML = `<tr><td colspan="4" class="p-3 text-red-500 text-center">⚠️ ${error.message}</td></tr>`;
    }
});
