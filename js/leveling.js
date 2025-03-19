// Leveling system configuration
const LEVELS = [
    { title: "Waste Watcher", icon: "🌱", requiredPoints: 0 },
    { title: "Eco Warrior", icon: "🌿", requiredPoints: 100 },
    { title: "Green Guardian", icon: "🌳", requiredPoints: 250 },
    { title: "Earth Protector", icon: "🌍", requiredPoints: 500 },
    { title: "Zero Waste Hero", icon: "⭐", requiredPoints: 1000 }
];

// Calculate points based on user's stats
function calculatePoints(co2Saved, itemsManaged, wastePrevented) {
    // Points formula: 
    // 1 point per kg of CO2 saved
    // 2 points per item managed
    // 5 points per kg of waste prevented
    return Math.floor(co2Saved + (itemsManaged * 2) + (wastePrevented * 5));
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
    const currentLevelIndex = getCurrentLevel(points);
    const currentLevel = LEVELS[currentLevelIndex];
    const progress = calculateProgress(points);

    // Update current level title and number
    document.getElementById('current-level-title').textContent = currentLevel.title;
    document.getElementById('level-number').textContent = `Level ${currentLevelIndex + 1}`;

    // Update next level information if not at max level
    if (currentLevelIndex < LEVELS.length - 1) {
        const nextLevel = LEVELS[currentLevelIndex + 1];
        document.getElementById('next-level-title').textContent = nextLevel.title;
    } else {
        document.getElementById('next-level-title').textContent = "Max Level Reached!";
    }

    // Update progress bar
    document.getElementById('progress-percentage').textContent = `${progress}%`;
    document.getElementById('progress-bar').style.width = `${progress}%`;

    // Update level milestones to show current level
    const milestones = document.querySelectorAll('.level-milestone');
    milestones.forEach((milestone, index) => {
        if (index <= currentLevelIndex) {
            milestone.classList.add('text-green-600');
            milestone.classList.remove('text-gray-700');
        } else {
            milestone.classList.remove('text-green-600');
            milestone.classList.add('text-gray-700');
        }
    });
}

// Initialize leveling system
function initializeLevelSystem() {
    // Get stats from the page
    const co2Saved = parseFloat(document.getElementById('total-saved').textContent) || 0;
    const itemsManaged = parseInt(document.getElementById('items-managed').textContent) || 0;
    const wastePrevented = parseFloat(document.getElementById('waste-prevented').textContent) || 0;

    // Calculate total points
    const points = calculatePoints(co2Saved, itemsManaged, wastePrevented);

    // Update UI
    updateLevelUI(points);
}

// Create a MutationObserver to watch for changes in the stats
function observeStatsChanges() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'characterData' || mutation.type === 'childList') {
                initializeLevelSystem();
            }
        });
    });

    // Observe changes in the stats elements
    const statsElements = [
        document.getElementById('total-saved'),
        document.getElementById('items-managed'),
        document.getElementById('waste-prevented')
    ];

    statsElements.forEach(element => {
        if (element) {
            observer.observe(element, {
                characterData: true,
                childList: true,
                subtree: true
            });
        }
    });
}

// Listen for DOM content loaded to initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeLevelSystem();
    observeStatsChanges();
});

// Export functions for use in other files
window.levelSystem = {
    calculatePoints,
    getCurrentLevel,
    calculateProgress,
    updateLevelUI,
    initializeLevelSystem
}; 