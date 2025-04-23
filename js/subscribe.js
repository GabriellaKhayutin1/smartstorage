console.log('--- subscribe.js: Script Start ---');

// ✅ Dynamic API base URL
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5003"
    : "https://smartstorage-k0v4.onrender.com";

// Initialize Stripe
const stripe = Stripe('pk_test_51RGi59CFusp413AAv9Qh9XeVgaNVaaoeALB07uycp5tLq7vgnoerP5uPtO43yVxs818wAzNvLkPCrrFPZlpvEbS600qfdkE6cW');

document.addEventListener('DOMContentLoaded', () => {
    console.log('--- subscribe.js: DOMContentLoaded event fired ---');
    
    // Check if we're returning from a successful payment
    const urlParams = new URLSearchParams(window.location.search);
    console.log('--- subscribe.js: URL Params:', window.location.search);
    const sessionId = urlParams.get('session_id');
    const status = urlParams.get('status'); // Check for 'status' param

    console.log('--- subscribe.js: Parsed Params:', { sessionId, status });

    // *** Corrected condition: Check for sessionId and status === 'success' ***
    if (sessionId && status === 'success') {
        console.log('--- subscribe.js: Conditions met, calling handleSuccessfulSubscription ---');
        handleSuccessfulSubscription(sessionId);
    } else {
        console.log('--- subscribe.js: Conditions NOT met for successful subscription handling ---');
    }

    const subscribeButton = document.getElementById('subscribeBtn');
    if (subscribeButton) {
        console.log('✅ Subscribe button found');
        subscribeButton.addEventListener('click', handleSubscription);
    } else {
        console.error('❌ Subscribe button not found');
    }
});

async function handleSuccessfulSubscription(sessionId) {
    console.log('--- subscribe.js: handleSuccessfulSubscription START ---');
    try {
        const token = sessionStorage.getItem('token') || sessionStorage.getItem('authToken'); // Also check authToken
        console.log('--- subscribe.js: Retrieved token:', token ? 'Exists' : 'null/undefined');
        if (!token) {
            console.error('❌ No token found');
            throw new Error('Please log in first');
        }

        console.log('🔄 Verifying subscription with session ID:', sessionId);

        console.log('--- subscribe.js: Calling /verify-subscription endpoint ---');
        // Verify subscription status with backend
        const response = await fetch(`${API_BASE_URL}/api/payments/verify-subscription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ sessionId }),
            credentials: 'include'
        });

        console.log('--- subscribe.js: /verify-subscription Response Status:', response.status);
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Subscription verification failed:', errorData);
            
            // If token is invalid, redirect to login
            if (response.status === 401) {
                sessionStorage.removeItem('token');
                window.location.href = '/login.html';
                return;
            }
            
            throw new Error(errorData.error || 'Failed to verify subscription');
        }

        const data = await response.json();
        console.log('✅ Subscription verified:', data);
        console.log('--- subscribe.js: Checking response data for success and active status ---');

        if (data.status === 'success' && data.subscription.status === 'active') {
            console.log('--- subscribe.js: Verification success, redirecting to dashboard ---');
            // Clear any existing error messages
            const errorElement = document.querySelector('.error-message');
            if (errorElement) {
                errorElement.remove();
            }

            // *** Show Success Modal ***
            const successModal = document.getElementById('successModal');
            const successModalMessage = document.getElementById('successModalMessage'); // Optional: Update message if needed
            // successModalMessage.textContent = 'Your custom success message!'; // Example if you want to change it
            if (successModal) {
                console.log('--- subscribe.js: Displaying success modal ---');
                successModal.classList.remove('hidden');
            } else {
                 console.error('--- subscribe.js: Success modal element not found! ---');
                 // Fallback to simple alert if modal fails
                 alert('Subscription activated successfully! Redirecting...');
            }
            
            // Store the new subscription status
            sessionStorage.setItem('subscriptionStatus', 'active');
            sessionStorage.setItem('subscriptionEndDate', data.subscription.currentPeriodEnd);

            // Redirect to dashboard after a short delay
            setTimeout(() => {
                console.log('--- subscribe.js: Executing redirect to /dashboard.html ---');
                window.location.href = '/dashboard.html';
            }, 2000);
        } else {
            console.error('--- subscribe.js: Verification response NOT successful/active ---', data);
            throw new Error('Subscription not active');
        }
    } catch (error) {
        console.error('❌ Error verifying subscription:', error);
        console.log('--- subscribe.js: handleSuccessfulSubscription CATCH block ---');
        
        // Show error message to user
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message text-red-600 text-center mt-4';
        errorMessage.textContent = error.message || 'There was an issue verifying your subscription. Please contact support.';
        document.querySelector('.max-w-md').appendChild(errorMessage);
    }
}

async function handleSubscription() {
    console.log('--- subscribe.js: handleSubscription START ---');
    console.log('🔄 Starting subscription process...');
    const button = document.getElementById('subscribeBtn');
    
    try {
        // Disable button and show loading state
        button.disabled = true;
        button.innerHTML = 'Processing...';
        
        const token = sessionStorage.getItem('token');
        if (!token) {
            console.error('❌ No token found');
            throw new Error('Please log in first');
        }

        console.log('🔄 Creating checkout session...');
        
        // Create checkout session
        const response = await fetch(`${API_BASE_URL}/api/payments/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        });

        if (!response.ok) {
            const data = await response.json();
            console.error('❌ Server error:', data);
            throw new Error(data.details || data.error || 'Failed to create checkout session');
        }

        const data = await response.json();
        console.log('✅ Checkout session created:', data.sessionId);

        // Redirect to Stripe Checkout
        const { error } = await stripe.redirectToCheckout({
            sessionId: data.sessionId
        });

        if (error) {
            console.error('❌ Stripe redirect error:', error);
            throw error;
        }

    } catch (error) {
        console.error('❌ Subscription error:', error);
        alert(error.message || 'Failed to process subscription. Please try again.');
        
        // Reset button state
        button.disabled = false;
        button.innerHTML = 'Subscribe Now';
    }
}
