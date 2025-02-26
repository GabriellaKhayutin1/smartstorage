document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById("login-btn");
    const registerBtn = document.getElementById("register-btn");

    if (loginBtn) {
        loginBtn.addEventListener("click", async () => {
            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;

            try {
                const response = await fetch("http://localhost:5003/api/auth/login", {  // ✅ FIXED ENDPOINT
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
                window.location.href = "http://127.0.0.1:5501"; // Redirect to dashboard
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
                window.location.href = "/public/login.html";
            } catch (error) {
                console.error("Error registering:", error);
                alert(error.message);
            }
        });
    }
});
