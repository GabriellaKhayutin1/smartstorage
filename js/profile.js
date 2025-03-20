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
            profilePicture.src = `${API_BASE_URL}${data.profilePicture}`;
            
            // Save to localStorage for persistence
            localStorage.setItem('profilePicture', `${API_BASE_URL}${data.profilePicture}`);

            // Show success message
            showNotification('Profile picture updated successfully!', 'success');
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            showNotification(error.message || 'Failed to upload profile picture. Please try again.', 'error');
        }
    });
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white z-50 transition-all duration-300 transform translate-y-0 opacity-100`;
    notification.textContent = message;

    document.body.appendChild(notification);

    requestAnimationFrame(() => {
        notification.style.transform = 'translateY(0)';
        notification.style.opacity = '1';
    });

    setTimeout(() => {
        notification.style.transform = 'translateY(-100%)';
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Initialize profile picture upload
        initializeProfilePictureUpload();

        // Load saved profile picture if exists
        const profilePicture = document.getElementById('profile-picture');
        const savedProfilePicture = localStorage.getItem('profilePicture');
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