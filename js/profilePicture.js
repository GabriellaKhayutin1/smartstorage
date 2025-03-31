// ✅ Define dynamic API base URL (localhost vs production)
const API_BASE_URL = window.location.hostname.includes("localhost") || window.location.hostname === "127.0.0.1"
  ? "http://localhost:5003"
  : "https://smartstorage-k0v4.onrender.com";

// ✅ Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const profilePictureInput = document.getElementById('profile-picture-input');
    const profilePicture = document.getElementById('profile-picture');

    if (!profilePictureInput || !profilePicture) {
        console.error('Profile picture elements not found');
        return;
    }

    const token = sessionStorage.getItem("token") || sessionStorage.getItem("authToken");
    if (!token) {
        console.error('No authentication token found');
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.userId;

        // Load profile picture
        loadUserProfilePicture(userId);
    } catch (error) {
        console.error('Error parsing token:', error);
    }

    // ✅ Upload picture
    profilePictureInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showNotification('Please select an image file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showNotification('Image size should be less than 5MB', 'error');
            return;
        }

        try {
            const token = sessionStorage.getItem("token") || sessionStorage.getItem("authToken");
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.userId;

            const formData = new FormData();
            formData.append('profilePicture', file);

            const response = await fetch(`${API_BASE_URL}/api/profile/upload-picture`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) throw new Error('Failed to upload profile picture');
            const data = await response.json();

            const profileUrl = `${API_BASE_URL}${data.profilePicture}`;
            profilePicture.src = profileUrl;
            sessionStorage.setItem(`profilePicture_${userId}`, profileUrl);

            showNotification('Profile picture updated successfully!', 'success');
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            showNotification('Failed to upload profile picture. Please try again.', 'error');
        }
    });
});

// ✅ Load Profile Picture
async function loadUserProfilePicture(userId) {
    try {
        const savedProfilePicture = sessionStorage.getItem(`profilePicture_${userId}`);
        if (savedProfilePicture) {
            document.getElementById('profile-picture').src = savedProfilePicture;
            return;
        }

        const token = sessionStorage.getItem("token") || sessionStorage.getItem("authToken");
        const response = await fetch(`${API_BASE_URL}/api/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.profilePicture) {
                const profilePictureUrl = `${API_BASE_URL}${data.profilePicture}`;
                document.getElementById('profile-picture').src = profilePictureUrl;
                sessionStorage.setItem(`profilePicture_${userId}`, profilePictureUrl);
            }
        }
    } catch (error) {
        console.error('Error loading profile picture:', error);
    }
}

// ✅ Notification helper
function showNotification(message, type) {
    try {
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
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}
