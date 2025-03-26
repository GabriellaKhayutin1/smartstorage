// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get elements
    const profilePictureInput = document.getElementById('profile-picture-input');
    const profilePicture = document.getElementById('profile-picture');

    // Check if elements exist before proceeding
    if (!profilePictureInput || !profilePicture) {
        console.error('Profile picture elements not found');
        return;
    }

    // Get user ID from token
    const token = sessionStorage.getItem("token") || sessionStorage.getItem("authToken");
    if (!token) {
        console.error('No authentication token found');
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.userId;

        // Load user's profile picture
        loadUserProfilePicture(userId);
    } catch (error) {
        console.error('Error parsing token:', error);
    }

    // Add change event listener
    profilePictureInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showNotification('Please select an image file', 'error');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('Image size should be less than 5MB', 'error');
            return;
        }

        try {
            // Get user ID from token
            const token = sessionStorage.getItem("token") || sessionStorage.getItem("authToken");
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.userId;

            // Create FormData
            const formData = new FormData();
            formData.append('profilePicture', file);

            // Send to backend with authentication
            const response = await fetch('http://localhost:5003/api/profile/upload-picture', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload profile picture');
            }

            const data = await response.json();
            
            // Update profile picture display
            profilePicture.src = `http://localhost:5003${data.profilePicture}`;
            
            // Save to sessionStorage with user-specific key
            sessionStorage.setItem(`profilePicture_${userId}`, `http://localhost:5003${data.profilePicture}`);

            // Show success message
            showNotification('Profile picture updated successfully!', 'success');
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            showNotification('Failed to upload profile picture. Please try again.', 'error');
        }
    });
});

// Function to load user's profile picture
async function loadUserProfilePicture(userId) {
    try {
        // Try to get from sessionStorage first
        const savedProfilePicture = sessionStorage.getItem(`profilePicture_${userId}`);
        if (savedProfilePicture) {
            document.getElementById('profile-picture').src = savedProfilePicture;
            return;
        }

        // If not in sessionStorage, fetch from backend
        const token = sessionStorage.getItem("token") || sessionStorage.getItem("authToken");
        const response = await fetch('http://localhost:5003/api/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.profilePicture) {
                const profilePictureUrl = `http://localhost:5003${data.profilePicture}`;
                document.getElementById('profile-picture').src = profilePictureUrl;
                sessionStorage  .setItem(`profilePicture_${userId}`, profilePictureUrl);
            }
        }
    } catch (error) {
        console.error('Error loading profile picture:', error);
    }
}

function showNotification(message, type) {
    try {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
            type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white z-50 transition-all duration-300 transform translate-y-0 opacity-100`;
        notification.textContent = message;

        // Add to document
        document.body.appendChild(notification);

        // Add animation
        requestAnimationFrame(() => {
            notification.style.transform = 'translateY(0)';
            notification.style.opacity = '1';
        });

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateY(-100%)';
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    } catch (error) {
        console.error('Error showing notification:', error);
    }
} 