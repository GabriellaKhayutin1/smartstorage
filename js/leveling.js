// Leveling system configuration
const LEVELS = [
    { title: "Waste Watcher", icon: "🌱", requiredPoints: 0 },
    { title: "Eco Warrior", icon: "🌿", requiredPoints: 200 },
    { title: "Green Guardian", icon: "🌳", requiredPoints: 600 },
    { title: "Earth Protector", icon: "🌍", requiredPoints: 1500 },
    { title: "Zero Waste Hero", icon: "⭐", requiredPoints: 3000 }
];


// Calculate points based on user's stats
function calculatePoints(co2Saved, itemsManaged, wastePrevented) {
    // Make points scale slower
    return Math.floor((co2Saved * 0.5) + (itemsManaged * 1.5) + (wastePrevented * 3));
    
}

// Get current level based on points
function getCurrentLevel(points) {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (points >= LEVELS[i].requiredPoints) {
            return i;
        }
    }
    return 0;
}

// Calculate progress to next level
function calculateProgress(points) {
    const currentLevelIndex = getCurrentLevel(points);
    if (currentLevelIndex === LEVELS.length - 1) {
        return 100; // Max level reached
    }

    const currentLevelPoints = LEVELS[currentLevelIndex].requiredPoints;
    const nextLevelPoints = LEVELS[currentLevelIndex + 1].requiredPoints;
    const pointsInCurrentLevel = points - currentLevelPoints;
    const pointsRequiredForNextLevel = nextLevelPoints - currentLevelPoints;

    return Math.min(100, Math.floor((pointsInCurrentLevel / pointsRequiredForNextLevel) * 100));
}

// Update the UI with level information
function updateLevelUI(points) {
    try {
        const currentLevelIndex = getCurrentLevel(points);
        const currentLevel = LEVELS[currentLevelIndex];
        const progress = calculateProgress(points);

        // Update current level title and number
        const currentLevelTitle = document.getElementById('current-level-title');
        const levelNumber = document.getElementById('level-number');
        const nextLevelTitle = document.getElementById('next-level-title');
        const progressPercentage = document.getElementById('progress-percentage');
        const progressBar = document.getElementById('progress-bar');

        if (currentLevelTitle) currentLevelTitle.textContent = currentLevel.title;
        if (levelNumber) levelNumber.textContent = `Level ${currentLevelIndex + 1}`;

        // Update next level information if not at max level
        if (nextLevelTitle) {
            if (currentLevelIndex < LEVELS.length - 1) {
                const nextLevel = LEVELS[currentLevelIndex + 1];
                nextLevelTitle.textContent = `${nextLevel.title} (${points}/${nextLevel.requiredPoints} pts)`;

                        
            } else {
                nextLevelTitle.textContent = "Max Level Reached!";
            }
        }

        // Update progress bar
        if (progressPercentage) progressPercentage.textContent = `${progress}%`;
        // Progress bar spans only 1/5 (20%) per level
const segmentWidth = 100 / (LEVELS.length - 1); // e.g. 25% per level if 5 levels
const overallProgress = (currentLevelIndex * segmentWidth) + ((progress / 100) * segmentWidth);
if (progressBar) progressBar.style.width = `${overallProgress}%`;


        // Update level milestones to show current level
        const milestones = document.querySelectorAll('.level-milestone');
milestones.forEach((milestone, index) => {
    milestone.classList.remove('active', 'text-green-600');
    milestone.classList.add('text-gray-700');

    if (index === currentLevelIndex) {
        milestone.classList.add('active', 'text-green-600');
        milestone.classList.remove('text-gray-700');
    }
});

    } catch (error) {
        console.error('Error updating level UI:', error);
    }
}

// Initialize leveling system
function initializeLevelSystem() {
    console.log("🔁 Initializing Level System...");

    try {
        const totalSaved = document.getElementById('total-saved');
        const itemsManaged = document.getElementById('items-managed');
        const wastePrevented = document.getElementById('waste-prevented');

        if (!totalSaved || !itemsManaged || !wastePrevented) {
            console.log('⏳ Stats elements not found, waiting for them to load...');
            return;
        }

        const co2Saved = parseFloat(totalSaved.textContent) || 0;
        const itemsManagedCount = parseInt(itemsManaged.textContent) || 0;
        const wastePreventedAmount = parseFloat(wastePrevented.textContent) || 0;

        const points = calculatePoints(co2Saved, itemsManagedCount, wastePreventedAmount);
        const levelIndex = getCurrentLevel(points);
        const levelTitle = LEVELS[levelIndex]?.title;

        // 🔍 Debug logs
        console.log("🌿 CO2 Saved:", co2Saved);
        console.log("📦 Items Managed:", itemsManagedCount);
        console.log("🗑️ Waste Prevented:", wastePreventedAmount);
        console.log("✅ Total Points:", points);
        console.log(`🏅 Current Level: ${levelTitle} (Level ${levelIndex + 1})`);

        updateLevelUI(points);
    } catch (error) {
        console.error('🚨 Error initializing level system:', error);
    }
}


// Create a MutationObserver to watch for changes in the stats
function observeStatsChanges() {
    const statsIds = ['total-saved', 'items-managed', 'waste-prevented'];
    const elements = statsIds.map(id => document.getElementById(id));

    // Check if any of the elements are missing
    if (elements.some(el => !el)) {
        console.warn('⏳ Waiting for stats elements to load...');
        setTimeout(observeStatsChanges, 200); // retry
        return;
    }

    const observer = new MutationObserver(() => {
        const co2Saved = parseFloat(elements[0].textContent);
        const itemsManaged = parseInt(elements[1].textContent);
        const wastePrevented = parseFloat(elements[2].textContent);

        // Check if all values are valid
        if (
            isNaN(co2Saved) ||
            isNaN(itemsManaged) ||
            isNaN(wastePrevented)
        ) {
            console.log("🚧 Waiting for valid stat values...");
            return;
        }

        // ✅ Valid values, continue
        console.log("🌿 CO₂ Saved:", co2Saved);
        console.log("📦 Items Managed:", itemsManaged);
        console.log("🗑️ Waste Prevented:", wastePrevented);

        const points = calculatePoints(co2Saved, itemsManaged, wastePrevented);
        console.log("✅ Total Points:", points);

        const levelIndex = getCurrentLevel(points);
        console.log(`🏅 Current Level: ${LEVELS[levelIndex].title} (Level ${levelIndex + 1})`);

        updateLevelUI(points);
    });

    elements.forEach(el => {
        observer.observe(el, { childList: true, subtree: true, characterData: true });
    });
}


// Wait for DOM content to be loaded
document.addEventListener('DOMContentLoaded', () => {
    observeStatsChanges(); // Smart and safe observer
});



// Export functions for use in other files
window.levelSystem = {
    calculatePoints,
    getCurrentLevel,
    calculateProgress,
    updateLevelUI,
    initializeLevelSystem
}; 