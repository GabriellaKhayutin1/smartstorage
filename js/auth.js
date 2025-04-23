// Auth utility functions
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5003"
    : "https://smartstorage-k0v4.onrender.com";

// Get the current token (checks sessionStorage first, then localStorage)
export function getToken() {
    let token = sessionStorage.getItem("token") || sessionStorage.getItem("authToken");
    if (!token) {
        token = localStorage.getItem("token");
    }
    return token;
}

// Set the token (stores in sessionStorage for session-only, could also store in localStorage if needed)
export function setToken(token) {
    // Primarily use sessionStorage based on findings in profile.js
    sessionStorage.setItem("token", token);
    // Optionally clear localStorage if migrating away from it
    localStorage.removeItem("token"); 
    localStorage.removeItem("authToken");
}

// Remove the token (from both storages)
export function removeToken() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("authToken");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
}

// Check if user is authenticated
export function isAuthenticated() {
    const token = getToken();
    if (!token) return false;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiration = payload.exp * 1000;
        if (Date.now() >= expiration) {
            removeToken();
            return false;
        }
        return true;
    } catch (err) {
        console.error("Invalid token:", err);
        removeToken();
        return false;
    }
}

// Add auth header to fetch requests
export function fetchWithAuth(url, options = {}) {
    const token = getToken();
    if (!token) {
        throw new Error('No authentication token available');
    }

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    return fetch(url, {
        ...options,
        headers
    });
}

// Redirect to login if not authenticated
export function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Handle API errors
export async function handleApiError(response) {
    if (response.status === 401) {
        removeToken();
        window.location.href = '/login.html';
        return;
    }
    
    const error = await response.json();
    throw new Error(error.error || 'An error occurred');
}

// ✅ Handle Google OAuth callback
document.addEventListener("DOMContentLoaded", () => {
  // Clear any previous alert flags when loading login page
  if (window.location.pathname.includes('login.html')) {
    sessionStorage.removeItem('alertShown');
  }

  if (window.location.pathname === '/auth/google/callback') {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      sessionStorage.setItem("token", token);
      window.location.href = "dashboard.html";
    } else {
      console.error("No token received from Google OAuth");
      window.location.href = "login.html";
    }
  }

  const loginForm = document.getElementById("login-form");
  const registerBtn = document.getElementById("register-btn");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;

      try {
        const response = await fetch(`${window.API_BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Login failed");
        }

        sessionStorage.setItem("token", data.token);
        // No need for login success alert, just redirect
        window.location.href = "dashboard.html";
      } catch (error) {
        console.error("Error logging in:", error);
        alert(error.message);
      }
    });
  }

  if (registerBtn) {
    registerBtn.addEventListener("click", async () => {
      const email = document.getElementById("register-email").value;
      const password = document.getElementById("register-password").value;

      try {
        const response = await fetch(`${window.API_BASE_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Registration failed");
        }

        // Success message and redirect
        alert("Registration successful! Please login.");
        window.location.href = "/login.html";
      } catch (error) {
        console.error("Error registering:", error);
        alert(error.message);
      }
    });
  }
});

// ✅ Handle logout
export function logout() {
    console.log("Logging out user...");
    removeToken(); // Clear token from sessionStorage and localStorage
    // Redirect to the login page
    window.location.href = '/login.html'; 
}

// ✅ Notification helper (Moved from profilePicture.js)
export function showNotification(message, type) {
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

// Calculates TOTAL potential CO2 savings from a list of ingredient objects (Moved from profile.js)
export function calculateCO2Savings(ingredients) {
  if (!Array.isArray(ingredients)) return 0;
  // Sum the co2Saved field directly from the ingredient data
  return ingredients.reduce((total, ingredient) => {
    // Ensure co2Saved is a number, default to 0 if missing or invalid
    const saved = (typeof ingredient.co2Saved === 'number' && ingredient.co2Saved > 0) ? ingredient.co2Saved : 0;
    return total + saved;
  }, 0);
}
