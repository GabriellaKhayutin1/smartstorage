import { CO2_SAVINGS } from "./co2Calculator.js";

// ✅ API Configuration
const API_BASE_URL = 'http://localhost:5003'; // Always use local development URL for now

function calculateCO2Savings(ingredients) {
    return ingredients.reduce((total, item) => {
        return total + (CO2_SAVINGS[item.category] || 0);
    }, 0);
}

function extractName(email) {
    if (!email) return 'Anonymous User';
    const parts = email.split('@');
    return parts[0] || 'Anonymous User';
}

function updateLeaderboardUI(leaderboard) {
    // Update podium
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
    `).join("");
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const token = localStorage.getItem("token") || localStorage.getItem("authToken");
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        // Get user data from token
        let userData;
        try {
            userData = JSON.parse(atob(token.split('.')[1]));
            console.log('User data from token:', userData);
        } catch (error) {
            console.error('Error parsing token:', error);
            localStorage.removeItem("token");
            localStorage.removeItem("authToken");
            window.location.href = '/login.html';
            return;
        }

        // Update user info
        const userNameElement = document.getElementById('user-name');
        const userEmailElement = document.getElementById('user-email');
        if (!userNameElement || !userEmailElement) {
            throw new Error('Missing user info DOM elements');
        }
        
        userNameElement.textContent = userData.name || extractName(userData.email);
        userEmailElement.textContent = userData.email || 'No email provided';

        // Fetch user's ingredients
        console.log('Fetching ingredients with token:', token);
        console.log('API URL:', `${API_BASE_URL}/api/ingredients`);
        
        try {
            const ingredientsResponse = await fetch(`${API_BASE_URL}/api/ingredients`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Ingredients response status:', ingredientsResponse.status);
            console.log('Ingredients response headers:', Object.fromEntries(ingredientsResponse.headers.entries()));
            
            if (!ingredientsResponse.ok) {
                if (ingredientsResponse.status === 401) {
                    console.log('Token is invalid or expired');
                    localStorage.removeItem("token");
                    localStorage.removeItem("authToken");
                    window.location.href = '/login.html';
                    return;
                }
                
                const errorText = await ingredientsResponse.text();
                console.error('Error response:', errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || `Failed to fetch ingredients: ${ingredientsResponse.status}`);
                } catch (e) {
                    throw new Error(`Failed to fetch ingredients: ${ingredientsResponse.status}`);
                }
            }

            const ingredients = await ingredientsResponse.json();
            console.log('User ingredients:', ingredients);

            // Calculate and update stats
            const co2Saved = calculateCO2Savings(ingredients);

            const totalSavedElement = document.getElementById('total-saved');
            const itemsManagedElement = document.getElementById('items-managed');
            const wastePreventedElement = document.getElementById('waste-prevented');

            if (!totalSavedElement || !itemsManagedElement || !wastePreventedElement) {
                throw new Error('Missing stats DOM elements');
            }

            totalSavedElement.textContent = co2Saved.toFixed(1);
            itemsManagedElement.textContent = ingredients.length;
            wastePreventedElement.textContent = (co2Saved * 0.5).toFixed(1);

            // Load leaderboard data
            console.log('Fetching leaderboard data...');
            const leaderboardResponse = await fetch(`${API_BASE_URL}/api/leaderboard/waste-reduction`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Leaderboard response status:', leaderboardResponse.status);
            
            if (!leaderboardResponse.ok) {
                const errorText = await leaderboardResponse.text();
                console.error('Leaderboard error response:', errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || `Failed to fetch leaderboard: ${leaderboardResponse.status}`);
                } catch (e) {
                    throw new Error(`Failed to fetch leaderboard: ${leaderboardResponse.status}`);
                }
            }

            const leaderboard = await leaderboardResponse.json();
            console.log('Leaderboard data:', leaderboard);

            // Update the UI with the leaderboard data
            updateLeaderboardUI(leaderboard);

        } catch (fetchError) {
            console.error('Fetch error:', fetchError);
            throw fetchError;
        }

        // Load monthly CO2 data and update chart
        await loadMonthlyCO2Data();

    } catch (error) {
        console.error('Error:', error);
        // Update UI to show error state
        const userNameElement = document.getElementById('user-name');
        const userEmailElement = document.getElementById('user-email');
        if (userNameElement && userEmailElement) {
            userNameElement.textContent = 'Error loading data';
            userEmailElement.textContent = error.message || 'Please try again later';
        }

        const leaderboardBody = document.getElementById('leaderboard-body');
        if (leaderboardBody) {
            leaderboardBody.innerHTML = `
                <tr>
                    <td colspan="3" class="p-4 text-red-500 text-center">
                        ⚠️ ${error.message || 'Error loading data'}
                    </td>
                </tr>`;
        }
    }
});

function updateAchievements(achievements) {
    const achievementsContainer = document.getElementById('achievements-container');
    if (!achievementsContainer) return;

    achievementsContainer.innerHTML = achievements.map(achievement => `
        <div class="achievement-card bg-white p-4 rounded-lg shadow-md">
            <div class="flex items-center space-x-3">
                <span class="text-2xl">${achievement.icon}</span>
                <div>
                    <h3 class="font-semibold text-lg">${achievement.name}</h3>
                    <p class="text-gray-600">${achievement.description}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function updateLeaderboard(leaderboard) {
    const leaderboardContainer = document.getElementById('leaderboard-container');
    if (!leaderboardContainer) return;

    // Update top 3 podium
    const podium = document.getElementById('podium');
    if (podium && leaderboard.length >= 3) {
        podium.innerHTML = `
            <div class="flex items-end justify-center space-x-4">
                <div class="text-center">
                    <div class="w-20 h-20 bg-silver rounded-t-lg flex items-center justify-center">
                        <span class="text-2xl">🥈</span>
                    </div>
                    <p class="mt-2 font-semibold">${leaderboard[1].name}</p>
                    <p class="text-sm">${leaderboard[1].score} pts</p>
                </div>
                <div class="text-center">
                    <div class="w-20 h-24 bg-gold rounded-t-lg flex items-center justify-center">
                        <span class="text-2xl">🥇</span>
                    </div>
                    <p class="mt-2 font-semibold">${leaderboard[0].name}</p>
                    <p class="text-sm">${leaderboard[0].score} pts</p>
                </div>
                <div class="text-center">
                    <div class="w-20 h-16 bg-bronze rounded-t-lg flex items-center justify-center">
                        <span class="text-2xl">🥉</span>
                    </div>
                    <p class="mt-2 font-semibold">${leaderboard[2].name}</p>
                    <p class="text-sm">${leaderboard[2].score} pts</p>
                </div>
            </div>
        `;
    }

    // Update leaderboard table
    const leaderboardTable = document.getElementById('leaderboard-table');
    if (leaderboardTable) {
        leaderboardTable.innerHTML = leaderboard.slice(3).map((user, index) => `
            <tr class="border-b">
                <td class="py-2">${index + 4}</td>
                <td class="py-2">${user.name}</td>
                <td class="py-2">${user.score} pts</td>
            </tr>
        `).join('');
    }
}

// Profile picture upload functionality
function initializeProfilePictureUpload() {
    const profilePictureInput = document.getElementById('profile-picture-input');
    const profilePicture = document.getElementById('profile-picture');

    if (!profilePictureInput || !profilePicture) {
        console.log('Profile picture elements not found');
        return;
    }

    profilePictureInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showNotification('Please select an image file', 'error');
            return;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('File size should be less than 5MB', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('profilePicture', file);

        try {
            const token = localStorage.getItem("token") || localStorage.getItem("authToken");
            if (!token) {
                window.location.href = '/login.html';
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/profile/upload-picture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload profile picture');
            }

            const data = await response.json();
            
            // Update the profile picture display
            profilePicture.src = `${API_BASE_URL}${data.profilePicture}?timestamp=${new Date().getTime()}`;
            
            // Save to localStorage for persistence
            localStorage.setItem(`profilePicture_${userData.email}`, `${API_BASE_URL}${data.profilePicture}?timestamp=${new Date().getTime()}`);

            // Show success message
            showNotification('Profile picture updated successfully!', 'success');
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            showNotification(error.message || 'Failed to upload profile picture. Please try again.', 'error');
        }
    });
}

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Initialize profile picture upload
        initializeProfilePictureUpload();

        // Load saved profile picture if exists
        const profilePicture = document.getElementById('profile-picture');
        const savedProfilePicture = localStorage.getItem(`profilePicture_${userData.email}`);
        if (profilePicture && savedProfilePicture) {
            profilePicture.src = savedProfilePicture;
        }

        // Add a small delay to ensure all elements are loaded
        setTimeout(() => {
            loadUserProfile();
        }, 100);
    } catch (error) {
        console.error('Error initializing profile:', error);
        showNotification('Error initializing profile. Please refresh the page.', 'error');
    }
});

async function loadUserProfile() {
    try {
        const token = localStorage.getItem("token") || localStorage.getItem("authToken");
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        // Get user data from token
        let userData;
        try {
            userData = JSON.parse(atob(token.split('.')[1]));
            console.log('User data from token:', userData);
        } catch (error) {
            console.error('Error parsing token:', error);
            localStorage.removeItem("token");
            localStorage.removeItem("authToken");
            window.location.href = '/login.html';
            return;
        }

        // Update user info
        const userNameElement = document.getElementById('user-name');
        const userEmailElement = document.getElementById('user-email');
        if (!userNameElement || !userEmailElement) {
            throw new Error('Missing user info DOM elements');
        }
        
        userNameElement.textContent = userData.name || extractName(userData.email);
        userEmailElement.textContent = userData.email || 'No email provided';

        // Fetch user's ingredients
        console.log('Fetching ingredients with token:', token);
        console.log('API URL:', `${API_BASE_URL}/api/ingredients`);
        
        try {
            const ingredientsResponse = await fetch(`${API_BASE_URL}/api/ingredients`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Ingredients response status:', ingredientsResponse.status);
            console.log('Ingredients response headers:', Object.fromEntries(ingredientsResponse.headers.entries()));
            
            if (!ingredientsResponse.ok) {
                if (ingredientsResponse.status === 401) {
                    console.log('Token is invalid or expired');
                    localStorage.removeItem("token");
                    localStorage.removeItem("authToken");
                    window.location.href = '/login.html';
                    return;
                }
                
                const errorText = await ingredientsResponse.text();
                console.error('Error response:', errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || `Failed to fetch ingredients: ${ingredientsResponse.status}`);
                } catch (e) {
                    throw new Error(`Failed to fetch ingredients: ${ingredientsResponse.status}`);
                }
            }

            const ingredients = await ingredientsResponse.json();
            console.log('User ingredients:', ingredients);

            // Calculate and update stats
            const co2Saved = calculateCO2Savings(ingredients);

            const totalSavedElement = document.getElementById('total-saved');
            const itemsManagedElement = document.getElementById('items-managed');
            const wastePreventedElement = document.getElementById('waste-prevented');

            if (!totalSavedElement || !itemsManagedElement || !wastePreventedElement) {
                throw new Error('Missing stats DOM elements');
            }

            totalSavedElement.textContent = co2Saved.toFixed(1);
            itemsManagedElement.textContent = ingredients.length;
            wastePreventedElement.textContent = (co2Saved * 0.5).toFixed(1);

            // Load leaderboard data
            console.log('Fetching leaderboard data...');
            const leaderboardResponse = await fetch(`${API_BASE_URL}/api/leaderboard/waste-reduction`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Leaderboard response status:', leaderboardResponse.status);
            
            if (!leaderboardResponse.ok) {
                const errorText = await leaderboardResponse.text();
                console.error('Leaderboard error response:', errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || `Failed to fetch leaderboard: ${leaderboardResponse.status}`);
                } catch (e) {
                    throw new Error(`Failed to fetch leaderboard: ${leaderboardResponse.status}`);
                }
            }

            const leaderboard = await leaderboardResponse.json();
            console.log('Leaderboard data:', leaderboard);

            // Update the UI with the leaderboard data
            updateLeaderboardUI(leaderboard);

        } catch (fetchError) {
            console.error('Fetch error:', fetchError);
            throw fetchError;
        }

    } catch (error) {
        console.error('Error loading user profile:', error);
        // Update UI to show error state
        const userNameElement = document.getElementById('user-name');
        const userEmailElement = document.getElementById('user-email');
        if (userNameElement && userEmailElement) {
            userNameElement.textContent = 'Error loading data';
            userEmailElement.textContent = error.message || 'Please try again later';
        }

        const leaderboardBody = document.getElementById('leaderboard-body');
        if (leaderboardBody) {
            leaderboardBody.innerHTML = `
                <tr>
                    <td colspan="3" class="p-4 text-red-500 text-center">
                        ⚠️ ${error.message || 'Error loading data'}
                    </td>
                </tr>`;
        }
    }
}

async function loadMonthlyCO2Data() {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    if (!token) {
        console.error('No token found for monthly CO2 data');
        return;
    }

    try {
        const year = new Date().getFullYear();
        console.log('Fetching monthly CO2 data for year:', year);
        const response = await fetch(`${API_BASE_URL}/api/co2-savings/monthly?year=${year}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Failed to fetch monthly CO2 data:', response.status);
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error('Failed to fetch monthly CO2 data');
        }

        const monthlyData = await response.json();
        console.log('Raw monthly CO2 data:', monthlyData);

        // Transform the data to ensure proper structure
        const transformedData = monthlyData.map(month => ({
            month: month.month || 0,
            co2Saved: typeof month.co2Saved === 'number' ? month.co2Saved : 0,
            itemsCount: typeof month.itemsCount === 'number' ? month.itemsCount : 0
        }));

        console.log('Transformed monthly data:', transformedData);
        updateCO2Chart(transformedData);
    } catch (error) {
        console.error('Error loading monthly CO2 data:', error);
    }
}

function updateCO2Chart(monthlyData) {
    console.log('Updating CO2 chart with data:', monthlyData);
    const canvas = document.getElementById('monthlyCO2Chart');
    if (!canvas) {
        console.error('Monthly CO2 chart canvas not found');
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get 2D context for chart');
        return;
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Ensure we have data for all months with proper values
    const chartData = monthNames.map((_, index) => {
        const monthData = monthlyData.find(m => m.month === index + 1) || { co2Saved: 0, itemsCount: 0 };
        const co2Value = typeof monthData.co2Saved === 'number' ? monthData.co2Saved : 0;
        return {
            co2Saved: parseFloat(co2Value.toFixed(2)),
            itemsCount: monthData.itemsCount || 0
        };
    });

    console.log('Final chart data:', chartData);
    
    // Calculate the maximum value for better scaling
    const maxCO2Value = Math.max(...chartData.map(m => m.co2Saved));
    console.log('Max CO2 value:', maxCO2Value);
    
    // Destroy existing chart if it exists
    if (window.monthlyCO2Chart instanceof Chart) {
        window.monthlyCO2Chart.destroy();
    }

    // Create new chart with explicit y-axis configuration
    window.monthlyCO2Chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthNames,
            datasets: [{
                label: 'CO2 Saved (kg)',
                data: chartData.map(m => m.co2Saved),
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
                    min: 0,
                    max: maxCO2Value > 0 ? maxCO2Value * 1.1 : 100,
                    ticks: {
                        stepSize: maxCO2Value > 100 ? 20 : maxCO2Value > 50 ? 10 : 5,
                        callback: function(value) {
                            return value + ' kg';
                        }
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
                    text: `Monthly CO2 Savings for ${new Date().getFullYear()}`
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const monthData = chartData[context.dataIndex];
                            return [
                                `CO2 Saved: ${monthData.co2Saved.toFixed(2)} kg`,
                                `Items Managed: ${monthData.itemsCount}`
                            ];
                        }
                    }
                }
            }
        }
    });
    console.log('Chart created successfully');
}