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

    // Load saved profile picture if exists
    const savedProfilePicture = localStorage.getItem('profilePicture');
    if (savedProfilePicture) {
        profilePicture.src = savedProfilePicture;
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
            // Create FormData
            const formData = new FormData();
            formData.append('profilePicture', file);

            // Send to backend
            const response = await fetch('http://localhost:5003/api/upload-profile-picture', {
                method: 'POST',
                body: formData,
                credentials: 'include' // Include cookies for authentication
            });

            if (!response.ok) {
                throw new Error('Failed to upload profile picture');
            }

            const data = await response.json();
            
            // Update profile picture display
            profilePicture.src = data.imageUrl;
            
            // Save to localStorage for persistence
            localStorage.setItem('profilePicture', data.imageUrl);

            // Show success message
            showNotification('Profile picture updated successfully!', 'success');
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            showNotification('Failed to upload profile picture. Please try again.', 'error');
        }
    });
});

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