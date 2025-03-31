import { CO2_SAVINGS } from "./co2Calculator.js";

// ✅ Dynamic API base URL
const API_BASE_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:5003"
  : "https://smartstorage-k0v4.onrender.com";

// ✅ Check for token in URL
const urlToken = new URLSearchParams(window.location.search).get("token");
if (urlToken) {
  sessionStorage.setItem("token", urlToken); // Store in sessionStorage for consistent usage

  fetch(`${API_BASE_URL}/api/profile`, {
    headers: { Authorization: `Bearer ${urlToken}` },
  })
    .then((res) => res.json())
    .then((user) => {
        const endDate = new Date(user.trialEnds);
        const today = new Date();
        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        const trialExpired = user.subscriptionStatus === "trial" && today > endDate;
      
        if (user.subscriptionStatus === "inactive" || trialExpired) {
            window.location.href = "/subscribe.html";
          
        } else {
          alert(`🎉 Welcome! You have a 7-day free trial. ${daysLeft} day(s) remaining.`);
        }
      
        window.history.replaceState({}, document.title, window.location.pathname);
      })
      
    .catch((err) => console.error("❌ Failed to fetch profile info:", err));
}

// ✅ DOM ready
document.addEventListener("DOMContentLoaded", () => {
  loadPantry();

  setTimeout(() => {
    window.scrollTo(0, 0);
    document.body.style.overflow = "auto";
  }, 50);

  document.getElementById("addIngredientBtn")?.addEventListener("click", () => showModal("add"));
  document.getElementById("closeModalBtn")?.addEventListener("click", hideModal);
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
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        category,
        expiryDate: new Date(expiryDate).toISOString(),
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Add failed");

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
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        category,
        expiryDate: new Date(expiryDate).toISOString(),
      }),
    });

    if (!response.ok) throw new Error("Update failed");
    hideModal();
    loadPantry();
  } catch (err) {
    console.error("❌ Error updating ingredient:", err);
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
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error("Delete failed");
    loadPantry();
  } catch (err) {
    console.error("❌ Error deleting ingredient:", err);
    alert(err.message);
  }
}

/* 🔹 Load Pantry */
async function loadPantry() {
  const token = sessionStorage.getItem("token");
  if (!token) return redirectToLogin();

  try {
    const response = await fetch(`${API_BASE_URL}/api/ingredients`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error("Fetch failed");
    const ingredients = await response.json();
    updatePantryUI(ingredients);
    updateCO2Component(ingredients);
  } catch (err) {
    console.error("❌ Error loading pantry:", err);
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

/* 🔹 Calculate Total CO₂ Saved */
function calculateCO2Savings(ingredients) {
  return ingredients
    .reduce((total, item) => total + (CO2_SAVINGS[item.category] || 0), 0)
    .toFixed(2);
}

/* 🔹 Redirect Helper */
function redirectToLogin() {
  alert("⚠ You must log in first!");
  window.location.href = "login.html";
}
