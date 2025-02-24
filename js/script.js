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

/* 🔹 Add Ingredient */
async function addIngredient() {
    let name = document.getElementById("ingredientName").value.trim();
    let category = document.getElementById("ingredientCategory").value;
    let expiryDate = document.getElementById("ingredientExpiry").value;

    console.log("📌 Data before sending:", { name, category, expiryDate }); // Debugging

    if (!name || !expiryDate) {
        alert("⚠ Please enter an ingredient name and expiry date!");
        return;
    }

    try {
        let response = await fetch("http://localhost:5001/ingredients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                category,
                expiryDate: new Date(expiryDate).toISOString() // ✅ Convert expiryDate to ISO format
            })
        });

        let data = await response.json();
        console.log("✅ Response from server:", data); // Debugging response

        if (!response.ok) throw new Error("Failed to add ingredient");

        hideModal();
        loadPantry();
    } catch (error) {
        console.error("❌ Error adding ingredient:", error);
    }
}

/* 🔹 Update Ingredient */
async function updateIngredient(id) {
    let name = document.getElementById("ingredientName").value.trim();
    let category = document.getElementById("ingredientCategory").value;
    let expiryDate = document.getElementById("ingredientExpiry").value;

    if (!name || !expiryDate) {
        alert("⚠ Please enter an ingredient name and expiry date!");
        return;
    }

    console.log("📌 Sending update request for:", { id, name, category, expiryDate });

    try {
        let response = await fetch(`http://localhost:5001/ingredients/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
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

/* 🔹 Remove an Ingredient */
async function removeIngredient(id) {
    try {
        let response = await fetch(`http://localhost:5001/ingredients/${id}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Failed to delete ingredient");

        loadPantry();
    } catch (error) {
        console.error("❌ Error removing ingredient:", error);
    }
}

/* 🔹 Fetch and Update Pantry UI */
async function loadPantry() {
    try {
        const response = await fetch("http://localhost:5001/ingredients");
        if (!response.ok) throw new Error("Failed to fetch ingredients");

        const ingredients = await response.json();
        updatePantryUI(ingredients);
    } catch (error) {
        console.error("❌ Error loading pantry:", error);
    }
}

/* 🔹 Update Pantry UI */
function updatePantryUI(ingredients) {
    const pantryDiv = document.getElementById("pantry");
    pantryDiv.innerHTML = ""; // ✅ Clear pantry list before refreshing

    const categories = {};

    ingredients.forEach(item => {
        if (!categories[item.category]) categories[item.category] = [];
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

            // ✅ Ensure expiry date format is correct
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
