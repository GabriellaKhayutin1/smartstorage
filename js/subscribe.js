const API_BASE_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:5003"
  : "https://smartstorage-k0v4.onrender.com";

document.getElementById("subscribeBtn").addEventListener("click", async () => {
  const token = sessionStorage.getItem("token");
  if (!token) {
    alert("⚠ You must log in first!");
    window.location.href = "login.html";
    return;
  }

  document.getElementById("status").classList.remove("hidden");

  try {
    const res = await fetch(`${API_BASE_URL}/api/payments/create`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: "5.00",
        description: "SmartStorage Monthly Subscription"
      })
    });

    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || "Payment session creation failed");

    window.location.href = data.url;
  } catch (err) {
    console.error("❌ Subscription error:", err);
    alert("Failed to start payment session.");
    document.getElementById("status").classList.add("hidden");
  }
});
