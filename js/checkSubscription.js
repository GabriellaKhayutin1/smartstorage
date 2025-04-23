// Dynamic API base URL
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5003"
    : "https://smartstorage-k0v4.onrender.com";

async function checkSubscriptionStatus() {
    try {
        const token = sessionStorage.getItem('token');
        if (!token) {
            console.error('❌ No token found');
            window.location.href = '/login.html';
            return false;
        }

        const response = await fetch(`${API_BASE_URL}/api/payments/check-subscription`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Subscription check failed:', data);
            if (response.status === 403) {
                // Subscription expired or invalid
                if (window.location.pathname !== '/subscribe_payment.html') {
                    window.location.href = '/subscribe_payment.html';
                }
                return false;
            }
            return false;
        }

        console.log('✅ Subscription status:', data);
        return true;
    } catch (error) {
        console.error('❌ Error checking subscription:', error);
        return false;
    }
}

// Check subscription status when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Only check subscription on protected pages
    const protectedPages = [
        '/dashboard.html',
        '/profile.html',
        // Add other protected pages here
    ];

    const currentPath = window.location.pathname;
    if (protectedPages.includes(currentPath)) {
        checkSubscriptionStatus();
    }
}); 