// ✅ Check if user is authenticated
function checkAuth() {
    const token = sessionStorage.getItem("token") || sessionStorage.getItem("authToken");
    if (!token) return false;

    try {
        // Check if token is expired
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiration = payload.exp * 1000;
        if (Date.now() >= expiration) {
            sessionStorage.removeItem("token");
            sessionStorage.removeItem("authToken");
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
    if (window.location.pathname === '/auth/google/callback') {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (token) {
            sessionStorage.setItem("token", token);
            window.location.href = "/profile.html"; // Redirect to profile page
        } else {
            console.error("No token received from Google OAuth");
            window.location.href = "/login.html";
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
                const response = await fetch("http://localhost:5003/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || "Login failed");
                }

                sessionStorage.setItem("token", data.token);
                alert("Login successful!");
                window.location.href = "/profile.html";
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
    sessionStorage.clear(); // Clears all session-based data
    window.location.href = "/login.html";
}
