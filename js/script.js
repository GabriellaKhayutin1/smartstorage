import { calculateCO2Savings, fetchWithAuth, logout, getToken, isAuthenticated, removeToken } from './auth.js';

// Define CO2 savings constants
const CO2_SAVINGS = {
    meat: 13.3,
    dairy: 3.2,
    vegetables: 0.4,
    fruits: 0.4,
    grains: 0.8,
    other: 1.0
};

// ✅ Dynamic API base URL - Fixing the logic
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5003"
    : "https://smartstorage-k0v4.onrender.com";

// ✅ Check for token in URL
const urlToken = new URLSearchParams(window.location.search).get("token");
if (urlToken) {
    sessionStorage.setItem("token", urlToken);
    console.log("✅ Token stored in session");
    
    // Remove token from URL
    window.history.replaceState({}, document.title, window.location.pathname);
}

// ✅ DOM ready
document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 DOMContentLoaded: Starting dashboard page initialization..."); 
    if (!isAuthenticated()) { 
        console.log("❌ No token/auth, redirecting to login");
        return redirectToLogin();
    }
    console.log("✅ Token found, loading dashboard");

    // --- Attach Logout Listener --- 
    const logoutButtons = document.querySelectorAll('button'); 
    logoutButtons.forEach(button => {
        if (button.textContent.toLowerCase() === 'logout') { 
            button.addEventListener('click', logout);
            console.log("🚀 Logout listener attached (dashboard).");
        }
    });
    // --- End Attach Logout Listener --- 

    try {
        // Verify token is valid by checking profile
        const token = getToken(); // Use getToken from auth.js
        const profileResponse = await fetch(`${API_BASE_URL}/api/profile`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!profileResponse.ok) {
            throw new Error('Profile fetch failed');
        }

        const user = await profileResponse.json();
        console.log("✅ Profile loaded:", user.email);

        // Check trial/subscription status
        const endDate = new Date(user.trialEnds);
        const today = new Date();
        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        const trialExpired = user.subscriptionStatus === "trial" && today > endDate;

        if (user.subscriptionStatus === "inactive" || trialExpired) {
            window.location.href = "/subscribe_payment.html";
            return;
        }

        // Load pantry
        await loadPantry(); 
        
        // Setup UI event listeners
        document.getElementById("addIngredientBtn")?.addEventListener("click", () => showModal("add"));
        document.getElementById("closeModalBtn")?.addEventListener("click", hideModal);

        // Fix scroll behavior
        setTimeout(() => {
            window.scrollTo(0, 0);
            document.body.style.overflow = "auto";
        }, 50);

        console.log("🚀 DOMContentLoaded: Dashboard initialization complete."); 

    } catch (error) {
        console.error("❌ Dashboard Initialization/Auth error:", error);
        // Use removeToken from auth.js before redirecting
        removeToken(); 
        redirectToLogin();
    }
});

/* 🔹 Show Modal */
function showModal(mode, id = "", name = "", category = "Meat", expiryDate = "") {
  const modal = document.getElementById("ingredientModal");
  if (!modal) return;

  modal.classList.remove("hidden");
  modal.classList.add("flex");

  document.getElementById("ingredientName").value = name;
  document.getElementById("ingredientExpiry").value = expiryDate
    ? new Date(expiryDate).toISOString().split("T")[0]
    : "";
  document.getElementById("ingredientCategory").value = category;

  const saveBtn = document.getElementById("saveIngredientBtn");
  saveBtn.replaceWith(saveBtn.cloneNode(true));
  const newSaveBtn = document.getElementById("saveIngredientBtn");

  if (mode === "add") {
    newSaveBtn.onclick = addIngredient;
    newSaveBtn.innerText = "Add";
  } else {
    newSaveBtn.onclick = () => updateIngredient(id);
    newSaveBtn.innerText = "Update";
  }
}

/* 🔹 Hide Modal */
function hideModal() {
  document.getElementById("ingredientModal").classList.add("hidden");
}

/* 🔹 Add Ingredient */
async function addIngredient() {
  const token = sessionStorage.getItem("token");
  if (!token) return redirectToLogin();

  const name = document.getElementById("ingredientName").value.trim();
  const category = document.getElementById("ingredientCategory").value;
  const expiryDate = document.getElementById("ingredientExpiry").value;

  if (!name || !expiryDate) return alert("⚠ Please enter name and expiry date!");

  try {
    const response = await fetch(`${API_BASE_URL}/api/ingredients`, {
      method: "POST",
      credentials: 'include',
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        category,
        expiryDate: new Date(expiryDate).toISOString()
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Add failed");
    }

    const data = await response.json();
    hideModal();
    loadPantry();
  } catch (err) {
    console.error("❌ Error adding ingredient:", err);
    alert(err.message || "Failed to add ingredient");
  }
}

/* 🔹 Update Ingredient */
async function updateIngredient(id) {
  const token = sessionStorage.getItem("token");
  if (!token) return redirectToLogin();

  const name = document.getElementById("ingredientName").value.trim();
  const category = document.getElementById("ingredientCategory").value;
  const expiryDate = document.getElementById("ingredientExpiry").value;

  if (!name || !expiryDate) return alert("⚠ Please enter name and expiry date!");

  try {
    const response = await fetch(`${API_BASE_URL}/api/ingredients/${id}`, {
      method: "PUT",
      credentials: 'include',
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        category,
        expiryDate: new Date(expiryDate).toISOString()
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Update failed");
    }

    hideModal();
    loadPantry();
  } catch (err) {
    console.error("❌ Error updating ingredient:", err);
    alert(err.message || "Failed to update ingredient");
  }
}

/* 🔹 Delete Ingredient */
async function removeIngredient(id) {
  if (!confirm("🛑 Delete this ingredient?")) return;

  const token = sessionStorage.getItem("token");
  if (!token) return redirectToLogin();

  try {
    const response = await fetch(`${API_BASE_URL}/api/ingredients/${id}`, {
      method: "DELETE",
      credentials: 'include',
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Delete failed");
    }

    loadPantry();
  } catch (err) {
    console.error("❌ Error deleting ingredient:", err);
    alert(err.message || "Failed to delete ingredient");
  }
}

/* 🔹 Load Pantry */
async function loadPantry() {
    const token = getToken();
    if (!token) return redirectToLogin();

    try {
        const response = await fetch(`${API_BASE_URL}/api/ingredients`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const ingredients = await response.json();

        const totalCo2Saved = calculateCO2Savings(ingredients);
        const co2DisplayElement = document.getElementById('co2-saved-value');
        if (co2DisplayElement) {
            co2DisplayElement.textContent = totalCo2Saved.toFixed(1);
            console.log(`pantry display`, totalCo2Saved);
        }

        updatePantryUI(ingredients);
    } catch (err) {
        console.error("❌ Error loading pantry:", err);
        if (err.message.includes('401')) {
            removeToken();
            redirectToLogin();
        } else {
            alert(err.message || "Failed to load pantry");
        }
    }
}

/* 🔹 Update CO₂ UI */
function updateCO2Component(ingredients) {
  const co2Saved = calculateCO2Savings(ingredients);
  const co2El = document.getElementById("co2-savings");
  if (co2El) co2El.innerText = `🌍 CO₂ Saved: ${co2Saved} kg`;
}

/* 🔹 Update Pantry UI */
function updatePantryUI(ingredients) {
  const pantryDiv = document.getElementById("pantry");
  if (!pantryDiv) return;

  pantryDiv.innerHTML = "";

  const categories = {};
  ingredients.forEach((item) => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });

  Object.keys(categories).forEach((category) => {
    const categoryDiv = document.createElement("div");
    categoryDiv.className = "mb-6";

    const title = document.createElement("h2");
    title.className = "text-xl font-bold text-gray-800 mb-3";
    title.innerText = category;

    const list = document.createElement("div");
    list.className = "ingredient-list";

    categories[category].forEach((item) => {
      const card = document.createElement("div");
      card.className = "ingredient-card flex justify-between p-4 bg-white shadow rounded-md";

      const dateObj = new Date(item.expiryDate);
      const formattedDate = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString("en-US")
        : "Unknown";

      const text = document.createElement("span");
      text.innerText = `${item.name} (Expires: ${formattedDate})`;
      text.className = "font-semibold text-gray-700";

      const editBtn = document.createElement("button");
      editBtn.innerHTML = "✏ Edit";
      editBtn.className = "bg-[#7CBF74] text-white px-3 py-1 rounded-lg shadow-md hover:bg-[#69A661]";
      editBtn.onclick = () => showModal("edit", item._id, item.name, item.category, item.expiryDate);

      const removeBtn = document.createElement("button");
      removeBtn.innerHTML = "❌";
      removeBtn.className = "bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600";
      removeBtn.onclick = () => removeIngredient(item._id);

      const buttonWrapper = document.createElement("div");
      buttonWrapper.className = "flex space-x-2";
      buttonWrapper.append(editBtn, removeBtn);

      card.append(text, buttonWrapper);
      list.append(card);
    });

    categoryDiv.append(title, list);
    pantryDiv.append(categoryDiv);
  });
}

/* 🔹 Scroll Animation */
document.addEventListener("scroll", () => {
  const hero = document.getElementById("heroSection");
  const pantry = document.getElementById("pantrySection");
  const scrollY = window.scrollY;

  if (pantry) pantry.style.transform = `translateY(${Math.max(0, scrollY - window.innerHeight)}px)`;
  if (hero) hero.style.opacity = Math.max(0, 1 - scrollY / window.innerHeight);
});

/* 🔹 Redirect Helper */
function redirectToLogin() {
    // Only show alert if we're not already on the login page and haven't shown it recently
    if (!window.location.pathname.includes('login.html') && !sessionStorage.getItem('alertShown')) {
        alert("⚠ You must log in first!");
        sessionStorage.setItem('alertShown', 'true');
        // Clear the alert flag after 2 seconds
        setTimeout(() => sessionStorage.removeItem('alertShown'), 2000);
    }
    window.location.href = "login.html";
}
