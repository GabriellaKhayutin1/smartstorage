import { CO2_SAVINGS } from "./co2Calculator.js";

const API_BASE_URL = window.API_BASE_URL;



function calculateCO2Savings(ingredients) {
    return ingredients.reduce((total, item) => total + (CO2_SAVINGS[item.category] || 0), 0);
}

function extractName(email) {
    if (!email) return 'Anonymous User';
    return email.split('@')[0] || 'Anonymous User';
}

function updateLeaderboardUI(leaderboard) {
    const firstPlaceName = document.getElementById('first-place-name');
    const firstPlaceCo2 = document.getElementById('first-place-co2');
    const secondPlaceName = document.getElementById('second-place-name');
    const secondPlaceCo2 = document.getElementById('second-place-co2');
    const thirdPlaceName = document.getElementById('third-place-name');
    const thirdPlaceCo2 = document.getElementById('third-place-co2');
    const leaderboardBody = document.getElementById('leaderboard-body');

    if (!firstPlaceName || !firstPlaceCo2 || !secondPlaceName || !secondPlaceCo2 || 
        !thirdPlaceName || !thirdPlaceCo2 || !leaderboardBody) {
        console.error('Missing leaderboard DOM elements');
        return;
    }

    if (leaderboard[0]) {
        firstPlaceName.textContent = leaderboard[0].name || extractName(leaderboard[0].email);
        firstPlaceCo2.textContent = `${leaderboard[0].co2Saved.toFixed(2)} kg`;
    }
    if (leaderboard[1]) {
        secondPlaceName.textContent = leaderboard[1].name || extractName(leaderboard[1].email);
        secondPlaceCo2.textContent = `${leaderboard[1].co2Saved.toFixed(2)} kg`;
    }
    if (leaderboard[2]) {
        thirdPlaceName.textContent = leaderboard[2].name || extractName(leaderboard[2].email);
        thirdPlaceCo2.textContent = `${leaderboard[2].co2Saved.toFixed(2)} kg`;
    }

    leaderboardBody.innerHTML = leaderboard.slice(3, 10).map((user, index) => `
        <tr class="hover:bg-gray-50 transition duration-200">
            <td class="p-4">${index + 4}</td>
            <td class="p-4">${user.name || extractName(user.email)}</td>
            <td class="p-4">${user.co2Saved.toFixed(2)} kg</td>
        </tr>
    `).join('');
}

function initializeProfilePictureUpload(userData) {
    const profilePictureInput = document.getElementById('profile-picture-input');
    const profilePicture = document.getElementById('profile-picture');
    if (!profilePictureInput || !profilePicture) return;

    profilePictureInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
            showNotification('Invalid file. Only images under 5MB allowed.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('profilePicture', file);

        const token = sessionStorage.getItem("token") ||sessionStorage.getItem("authToken");
        if (!token) return window.location.href = '/login.html';

        try {
            const response = await fetch(`${API_BASE_URL}/api/profile/upload-picture`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload profile picture');
            }

            const data = await response.json();
            const profileUrl = `${API_BASE_URL}${data.profilePicture}?timestamp=${Date.now()}`;

            profilePicture.src = profileUrl;
            sessionStorage.setItem(`profilePicture_${userData.email}`, profileUrl);
            showNotification('Profile picture updated!', 'success');
        } catch (error) {
            console.error('Upload error:', error);
            showNotification(error.message || 'Upload failed', 'error');
        }
    });
}

async function loadUserProfile() {
    const token =sessionStorage.getItem("token") || sessionStorage.getItem("authToken");
    if (!token) return window.location.href = '/login.html';

    let userData;
    try {
        userData = JSON.parse(atob(token.split('.')[1]));
    } catch (error) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("authToken");
        window.location.href = '/login.html';
        return;
    }

    document.getElementById('user-name').textContent = userData.name || extractName(userData.email);
    document.getElementById('user-email').textContent = userData.email;

    const savedProfilePicture = sessionStorage.getItem(`profilePicture_${userData.email}`);
    const profilePicture = document.getElementById('profile-picture');
    if (savedProfilePicture && profilePicture) {
        profilePicture.src = savedProfilePicture;
    }

    initializeProfilePictureUpload(userData);

    try {
        const ingredientsResponse = await fetch(`${API_BASE_URL}/api/ingredients`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!ingredientsResponse.ok) throw new Error('Failed to fetch ingredients');

        const ingredients = await ingredientsResponse.json();
        const co2Saved = calculateCO2Savings(ingredients);

        document.getElementById('total-saved').textContent = co2Saved.toFixed(1);
        document.getElementById('items-managed').textContent = ingredients.length;
        document.getElementById('waste-prevented').textContent = (co2Saved * 0.5).toFixed(1);

        const leaderboardResponse = await fetch(`${API_BASE_URL}/api/leaderboard/waste-reduction`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!leaderboardResponse.ok) throw new Error('Failed to fetch leaderboard');
        const leaderboard = await leaderboardResponse.json();
        updateLeaderboardUI(leaderboard);

    } catch (error) {
        console.error('Profile load error:', error);
        showNotification(error.message || 'Error loading profile', 'error');
        document.getElementById('user-name').textContent = 'Error';
        document.getElementById('user-email').textContent = error.message;
    }
}

async function loadMonthlyCO2Data() {
    const token = sessionStorage.getItem("token") || sessionStorage.getItem("authToken");
    if (!token) return;

    try {
        const year = new Date().getFullYear();
        const response = await fetch(`${API_BASE_URL}/api/co2-savings/monthly?year=${year}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch monthly CO2 data');
        const monthlyData = await response.json();

        const transformedData = monthlyData.map(month => ({
            month: month.month || 0,
            co2Saved: typeof month.co2Saved === 'number' ? month.co2Saved : 0,
            itemsCount: typeof month.itemsCount === 'number' ? month.itemsCount : 0
        }));

        updateCO2Chart(transformedData);
    } catch (error) {
        console.error('Monthly CO2 error:', error);
    }
}

function updateCO2Chart(monthlyData) {
    const canvas = document.getElementById('monthlyCO2Chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const chartData = monthNames.map((_, i) => {
        const month = monthlyData.find(m => m.month === i + 1) || { co2Saved: 0, itemsCount: 0 };
        return {
            co2Saved: parseFloat(month.co2Saved.toFixed(2)),
            itemsCount: month.itemsCount
        };
    });

    const maxCO2 = Math.max(...chartData.map(d => d.co2Saved)) || 10;

    if (window.monthlyCO2Chart instanceof Chart) {
        window.monthlyCO2Chart.destroy();
    }

    window.monthlyCO2Chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthNames,
            datasets: [{
                label: 'CO2 Saved (kg)',
                data: chartData.map(d => d.co2Saved),
                backgroundColor: 'rgba(92, 141, 90, 0.8)',
                borderColor: 'rgba(92, 141, 90, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: maxCO2 * 1.1,
                    ticks: {
                        stepSize: maxCO2 > 100 ? 20 : maxCO2 > 50 ? 10 : 5,
                        callback: value => `${value} kg`
                    },
                    title: {
                        display: true,
                        text: 'CO2 Saved (kg)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Monthly CO2 Savings (${new Date().getFullYear()})`
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const d = chartData[context.dataIndex];
                            return [`CO2 Saved: ${d.co2Saved} kg`, `Items: ${d.itemsCount}`];
                        }
                    }
                }
            }
        }
    });
}

// One unified DOMContentLoaded block
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await loadUserProfile();
        await loadMonthlyCO2Data();
    } catch (error) {
        console.error('Initialization error:', error);
        showNotification('Error initializing profile. Please refresh the page.', 'error');
    }
});
