document.addEventListener("DOMContentLoaded", async () => {
    const leaderboardBody = document.getElementById("leaderboard-body");

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

        // Clear previous rows before appending new ones
        leaderboardBody.innerHTML = "";

        leaderboard.forEach((user, index) => {
            const row = document.createElement("tr");
            row.classList.add("text-center", "transition-all", "duration-300", "ease-in-out", "hover:scale-105");

            // Apply Tailwind classes for ranking colors
            if (index === 0) {
                row.classList.add("bg-yellow-400", "text-white", "font-bold", "shadow-lg");
            } else if (index === 1) {
                row.classList.add("bg-gray-300", "text-black", "font-bold", "shadow-md");
            } else if (index === 2) {
                row.classList.add("bg-orange-500", "text-white", "font-bold", "shadow-md");
            } else {
                row.classList.add("bg-white", "text-gray-900");
            }

            row.innerHTML = `
                <td class="p-3">${index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}</td>
                <td class="p-3">${user.email}</td>
                <td class="p-3">${user.expiredItems}</td>
                <td class="p-3">${user.co2Saved.toFixed(2)} kg</td>
            `;

            leaderboardBody.appendChild(row);
        });

    } catch (error) {
        console.error("❌ Error loading leaderboard:", error);
        leaderboardBody.innerHTML = `<tr><td colspan="4" class="p-3 text-red-500 text-center">⚠️ ${error.message}</td></tr>`;
    }
});
