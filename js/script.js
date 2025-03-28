import { CO2_SAVINGS } from "./co2Calculator.js";
console.log("📍 Current URL:", window.location.href);
console.log("🔑 Extracted token:", new URLSearchParams(window.location.search).get("token"));


const token = new URLSearchParams(window.location.search).get("token");
console.log("🔐 Token from URL:", token);


if (token) {
    localStorage.setItem("token", token); // ✅ Save token for future use

    fetch("http://localhost:5003/api/profile", {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
        .then(res => res.json())
        .then(user => {
            if (user.subscriptionStatus === "trial") {
                const endDate = new Date(user.trialEnds);
                const today = new Date();
                const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

                alert(`🎉 Welcome! You have a 7-day free trial. ${daysLeft} day(s) remaining before you need to subscribe.`);
                // After showing the alert inside the .then block:
                window.history.replaceState({}, document.title, window.location.pathname);

            }
        })
        .catch(err => console.error("❌ Failed to fetch profile info:", err));
}

document.addEventListener("DOMContentLoaded", () => {
    loadPantry();

    setTimeout(() => {
        window.scrollTo(0, 0);
        document.body.style.overflow = "auto";
    }, 50);

    const addButton = document.getElementById("addIngredientBtn");
    if (addButton) {
        addButton.addEventListener("click", () => showModal("add"));
    }

    const closeButton = document.getElementById("closeModalBtn");
    if (closeButton) {
        closeButton.addEventListener("click", hideModal);
    }

    // Add event listener for save button
    const saveButton = document.getElementById("saveIngredientBtn");
    if (saveButton) {
        saveButton.addEventListener("click", addIngredient);
    }
});

/* 🔹 Show Modal (For Adding or Editing) */
function showModal(mode, id = "", name = "", category = "Meat", expiryDate = "") {
    console.log(`✅ Show Modal Clicked for ${mode}`);

    const modal = document.getElementById("ingredientModal");
    if (!modal) {
        console.error("❌ Modal element not found!");
        return;
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");

    // ✅ Fill in the modal with existing values if editing
    document.getElementById("ingredientName").value = name;
    document.getElementById("ingredientExpiry").value = expiryDate ? new Date(expiryDate).toISOString().split("T")[0] : "";
    document.getElementById("ingredientCategory").value = category;

    const saveBtn = document.getElementById("saveIngredientBtn");
    if (!saveBtn) {
        console.error("❌ Save button not found!");
        return;
    }

    // ✅ Remove previous event listener
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

// Function to add an ingredient
async function addIngredient() {
    const token = sessionStorage.getItem("authToken") || sessionStorage.getItem("token");
    if (!token) {
        alert("⚠ You must log in first!");
        window.location.href = "login.html";  // Redirect to login if no token
        return;
    }

    let name = document.getElementById("ingredientName").value.trim();
    let category = document.getElementById("ingredientCategory").value;
    let expiryDate = document.getElementById("ingredientExpiry").value;

    if (!name || !expiryDate) {
        alert("⚠ Please enter an ingredient name and expiry date!");
        return;
    }

    try {
        console.log("🔑 Using token:", token); // Debug log
        const response = await fetch("http://localhost:5003/api/ingredients", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` // Make sure token is properly formatted
            },
            body: JSON.stringify({
                name,
                category,
                expiryDate: new Date(expiryDate).toISOString()
            })
        });

        // Log the response status and headers for debugging
        console.log("📡 Response status:", response.status);
        console.log("📡 Response headers:", Object.fromEntries(response.headers));

        const data = await response.json();
        console.log("✅ Response from server:", data);

        if (!response.ok) {
            if (response.status === 401) {
                // Token is invalid or expired
                sessionStorage.removeItem("authToken");
                sessionStorage.removeItem("token");
                alert("Your session has expired. Please log in again.");
                window.location.href = "login.html";
                return;
            }
            throw new Error(data.error || "Failed to add ingredient");
        }

        // Hide the modal and reload the pantry
        hideModal();
        loadPantry();
    } catch (error) {
        console.error("❌ Error adding ingredient:", error);
        alert(error.message || "Failed to add ingredient. Please try again.");
    }
}

// Attach the addIngredient function to the Add Ingredient button
document.getElementById("saveIngredientBtn").addEventListener("click", addIngredient);



/* 🔹 Update Ingredient */
async function updateIngredient(id) {
    let name = document.getElementById("ingredientName").value.trim();
    let category = document.getElementById("ingredientCategory").value;
    let expiryDate = document.getElementById("ingredientExpiry").value;

    if (!name || !expiryDate) {
        alert("⚠ Please enter an ingredient name and expiry date!");
        return;
    }

    const token = sessionStorage.getItem("authToken") || sessionStorage.getItem("token");
    if (!token) {
        alert("⚠ You must log in first!");
        window.location.href = "login.html";
        return;
    }

    console.log("📌 Sending update request for:", { id, name, category, expiryDate });

    try {
        let response = await fetch(`http://localhost:5003/api/ingredients/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`  // Add token to the Authorization header
            },
            body: JSON.stringify({
                name,
                category,
                expiryDate: new Date(expiryDate).toISOString()
            })
        });

        if (!response.ok) throw new Error("Failed to update ingredient");

        console.log(`✅ Ingredient updated successfully: ${id}`);
        hideModal();
        loadPantry(); // ✅ Reload pantry to show the updated ingredient
    } catch (error) {
        console.error("❌ Error updating ingredient:", error);
    }
}

/* 🔹 Remove an Ingredient with Confirmation */
async function removeIngredient(id) {
    // ✅ Show confirmation popup before deleting
    const confirmDelete = confirm("🛑 Are you sure you want to delete this ingredient?");
    if (!confirmDelete) return; // 🚫 Stop if the user cancels

    // ✅ Get token from sessionStorage
    const token = sessionStorage.getItem("authToken") || sessionStorage.getItem("token");
    if (!token) {
        alert("⚠ You must log in first!");
        window.location.href = "login.html"; // Redirect to login
        return;
    }

    try {
        let response = await fetch(`http://localhost:5003/api/ingredients/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + token, // ✅ Attach token
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) throw new Error("Failed to delete ingredient");

        console.log(`✅ Ingredient deleted successfully: ${id}`);
        loadPantry(); // ✅ Reload pantry after deletion
    } catch (error) {
        console.error("❌ Error removing ingredient:", error);
        alert(error.message);
    }
}


/* 🔹 Fetch and Update Pantry UI */
async function loadPantry() {
    const token = sessionStorage.getItem("authToken") || sessionStorage.getItem("token");
    if (!token) {
        alert("⚠ You must log in first!");
        window.location.href = "login.html"; // Redirect to login if no token
        return;
    }

    try {
        const response = await fetch("http://localhost:5003/api/ingredients", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token, // ✅ Attach token
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) throw new Error("Failed to fetch ingredients");

        const ingredients = await response.json();
        console.log("✅ Loaded Ingredients:", ingredients);
        updatePantryUI(ingredients);
        // ✅ Calculate and display CO₂ savings
        updateCO2Component(ingredients);
    } catch (error) {
        console.error("❌ Error loading pantry:", error);
    }
}
/* 🔹 Update CO₂ Savings Display */
function updateCO2Component(ingredients) {
    const co2Saved = calculateCO2Savings(ingredients); // ✅ Calculate CO₂ savings
    const co2Element = document.getElementById("co2-savings");

    if (co2Element) {
        co2Element.innerText = `🌍 CO₂ Saved: ${co2Saved} kg`;
    } else {
        console.warn("⚠ CO₂ Savings element not found!");
    }
}


/* 🔹 Update Pantry UI */
/* 🔹 Update Pantry UI */
function updatePantryUI(ingredients) {
    const pantryDiv = document.getElementById("pantry");
    if (!pantryDiv) {
        console.error("❌ Pantry element not found!");
        return;
    }

    pantryDiv.innerHTML = ""; // ✅ Clear previous content

    const categories = {};

    // ✅ Group ingredients by category
    ingredients.forEach(item => {
        if (!categories[item.category]) {
            categories[item.category] = [];
        }
        categories[item.category].push(item);
    });

    Object.keys(categories).forEach(category => {
        const categoryDiv = document.createElement("div");
        categoryDiv.className = "mb-6";

        const title = document.createElement("h2");
        title.className = "text-xl font-bold text-gray-800 mb-3";
        title.innerText = category;

        const list = document.createElement("div");
        list.className = "ingredient-list";

        categories[category].forEach(item => {
            const card = document.createElement("div");
            card.className = "ingredient-card flex justify-between p-4 bg-white shadow rounded-md";

            // ✅ Format expiry date
            let formattedDate = "Unknown";
            if (item.expiryDate) {
                const dateObj = new Date(item.expiryDate);
                if (!isNaN(dateObj.getTime())) {
                    formattedDate = dateObj.toLocaleDateString("en-US");
                }
            }

            const text = document.createElement("span");
            text.innerText = `${item.name} (Expires: ${formattedDate})`;
            text.className = "font-semibold text-gray-700";

            const buttonDiv = document.createElement("div");

            const editBtn = document.createElement("button");
            editBtn.innerHTML = "✏ Edit";
            editBtn.className = "bg-[#7CBF74] text-white px-3 py-1 rounded-lg shadow-md hover:bg-[#69A661] transition";
            editBtn.onclick = () => showModal("edit", item._id, item.name, item.category, item.expiryDate);

            const removeBtn = document.createElement("button");
            removeBtn.innerHTML = "❌";
            removeBtn.className = "bg-red-500 text-white px-3 py-1 rounded-lg shadow-md hover:bg-red-600 transition";
            removeBtn.onclick = () => removeIngredient(item._id);

            const buttonWrapper = document.createElement("div");
            buttonWrapper.className = "flex space-x-2"; // ✅ Adds spacing between buttons

            buttonWrapper.appendChild(editBtn);
            buttonWrapper.appendChild(removeBtn);
            buttonDiv.appendChild(buttonWrapper);

            card.appendChild(text);
            card.appendChild(buttonDiv);
            list.appendChild(card);
        });

        categoryDiv.appendChild(title);
        categoryDiv.appendChild(list);
        pantryDiv.appendChild(categoryDiv);
    });
}


/* 🔹 Smooth Scroll Animation for Pantry Section */
document.addEventListener("scroll", () => {
    const heroSection = document.getElementById("heroSection");
    const pantrySection = document.getElementById("pantrySection");
    const scrollPosition = window.scrollY;

    // ✅ Move the pantry section upwards as the user scrolls
    pantrySection.style.transform = `translateY(${Math.max(0, scrollPosition - window.innerHeight)}px)`;

    // ✅ Adjust hero section opacity as it gets covered
    heroSection.style.opacity = Math.max(0, 1 - (scrollPosition / window.innerHeight));
});
/* 🔹 Calculate Total CO₂ Savings */
function calculateCO2Savings(ingredients) {
    let totalCO2Saved = 0;

    ingredients.forEach(item => {
        const co2Value = CO2_SAVINGS[item.category] || 0; // Default to 0 if category not found
        totalCO2Saved += co2Value;
    });

    return totalCO2Saved.toFixed(2); // ✅ Keep two decimal places
}
