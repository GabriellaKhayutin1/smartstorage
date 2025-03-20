// ✅ Check if user is authenticated
function checkAuth() {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    if (!token) {
        return false;
    }
    try {
        // Check if token is expired
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiration = payload.exp * 1000; // Convert to milliseconds
        if (Date.now() >= expiration) {
            localStorage.removeItem("token");
            localStorage.removeItem("authToken");
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error checking auth:", error);
        return false;
    }
}

// ✅ Handle Google OAuth callback
document.addEventListener("DOMContentLoaded", () => {
    // Check if we're on the callback page
    if (window.location.pathname === '/auth/google/callback') {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
            localStorage.setItem("token", token);
            window.location.href = "/profile.html"; // Redirect to profile page
        } else {
            console.error("No token received from Google OAuth");
            window.location.href = "/login.html"; // Redirect back to login
        }
    }

    const loginForm = document.getElementById("login-form");
    const registerBtn = document.getElementById("register-btn");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault(); // Prevent form from submitting normally
            
            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;

            try {
                const response = await fetch("http://localhost:5003/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || "Login failed");
                }

                localStorage.setItem("token", data.token);
                alert("Login successful!");
                window.location.href = "/profile.html"; // Redirect to profile page
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
                const response = await fetch("http://localhost:5003/api/auth/register", { 
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || "Registration failed");
                }

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
function logout() {
    // Clear authentication data
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    
    // Redirect to login page
    window.location.href = "/login.html";
}
