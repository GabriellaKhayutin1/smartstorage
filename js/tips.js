import { isAuthenticated, logout } from './auth.js';

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 DOMContentLoaded: Starting tips page initialization...");
    if (!isAuthenticated()) {
        console.log("❌ No token/auth on tips page, redirecting to login");
        window.location.href = '/login.html';
        return;
    }
    console.log("✅ Token found, tips page loaded.");

    // Attach Logout Listener
    const logoutButtons = document.querySelectorAll('button');
    logoutButtons.forEach(button => {
        if (button.textContent.toLowerCase() === 'logout') {
            button.addEventListener('click', logout);
            console.log("🚀 Logout listener attached (tips).");
        }
    });
}); 